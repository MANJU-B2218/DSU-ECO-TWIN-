"""Waste classification training module using MobileNetV2 and PyTorch.

This script trains a transfer learning model to classify garbage into 6 categories:
cardboard, glass, metal, paper, plastic, and trash.
"""

import json
import os
import shutil
import sys
import zipfile
from typing import Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import torch
import torch.nn as nn
import torch.optim as optim
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix
from torch.utils.data import DataLoader, Dataset, Subset, WeightedRandomSampler
import torchvision.models as models
import torchvision.transforms as transforms
from torchvision.datasets import ImageFolder

# Base directory paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODEL_DIR = os.path.join(BASE_DIR, "model")
MODEL_SAVE_PATH = os.path.join(MODEL_DIR, "waste_classifier.pth")
CLASS_LABELS_PATH = os.path.join(MODEL_DIR, "class_labels.json")
BIO_MAPPING_PATH = os.path.join(MODEL_DIR, "bio_mapping.json")
CONFUSION_MATRIX_PATH = os.path.join(MODEL_DIR, "confusion_matrix.png")

# Class-to-bio mapping
BIO_MAPPING: Dict[str, str] = {
    "cardboard": "Bio-degradable",
    "glass": "Non-bio-degradable",
    "metal": "Non-bio-degradable",
    "paper": "Bio-degradable",
    "plastic": "Non-bio-degradable",
    "trash": "Non-bio-degradable",
}

# ImageNet normalization statistics
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


class TransformSubset(Dataset):
    """Custom Dataset wrapper to apply distinct transforms on Subset partitions."""

    def __init__(self, subset: Subset, transform: transforms.Compose):
        self.subset = subset
        self.transform = transform

    def __getitem__(self, index: int):
        x, y = self.subset[index]
        if self.transform:
            x = self.transform(x)
        return x, y

    def __len__(self) -> int:
        return len(self.subset)


def download_dataset(target_dir: str = DATASET_DIR) -> None:
    """Attempt to download Kaggle garbage classification dataset or guide user.

    Dataset: 'asdasdasasdas/garbage-classification'
    """
    os.makedirs(target_dir, exist_ok=True)

    # Check if category subdirectories already exist
    expected_categories = list(BIO_MAPPING.keys())
    existing_dirs = [d for d in os.listdir(target_dir) if os.path.isdir(os.path.join(target_dir, d))]
    if all(cat in existing_dirs for cat in expected_categories):
        print(f"[INFO] Dataset already present in {target_dir}")
        return

    print("[INFO] Attempting to download dataset via Kaggle API...")
    try:
        import kaggle  # type: ignore

        kaggle.api.authenticate()
        kaggle.api.dataset_download_files(
            "asdasdasasdas/garbage-classification",
            path=target_dir,
            unzip=True,
        )
        print("[SUCCESS] Dataset downloaded and extracted successfully.")
    except Exception as exc:
        print(f"[WARNING] Automatic download via Kaggle API failed: {exc}")
        print("\n" + "=" * 70)
        print("MANUAL DOWNLOAD INSTRUCTIONS:")
        print("1. Visit https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification")
        print("2. Download the archive and extract it into:")
        print(f"   {target_dir}")
        print("3. Ensure the folder structure is:")
        for cat in expected_categories:
            print(f"   {target_dir}/{cat}/")
        print("=" * 70 + "\n")


def locate_dataset_root(base_dataset_dir: str) -> str:
    """Find the directory containing the class folders, handling nested extractions."""
    expected_classes = set(BIO_MAPPING.keys())
    if not os.path.exists(base_dataset_dir):
        return base_dataset_dir

    # Check top-level
    subdirs = {d.lower(): d for d in os.listdir(base_dataset_dir) if os.path.isdir(os.path.join(base_dataset_dir, d))}
    if expected_classes.issubset(set(subdirs.keys())):
        return base_dataset_dir

    # Search one or two levels deeper (common in Kaggle unzips)
    for root, dirs, _ in os.walk(base_dataset_dir):
        lower_dirs = {d.lower(): d for d in dirs}
        if expected_classes.issubset(set(lower_dirs.keys())):
            return root

    return base_dataset_dir


def get_transforms() -> Tuple[transforms.Compose, transforms.Compose]:
    """Return data augmentations for training and deterministic transforms for validation/testing."""
    train_transforms = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])

    eval_transforms = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])

    return train_transforms, eval_transforms


def build_model(num_classes: int) -> nn.Module:
    """Construct MobileNetV2 with frozen feature layers and custom classifier head."""
    try:
        weights = models.MobileNet_V2_Weights.DEFAULT
        model = models.mobilenet_v2(weights=weights)
    except AttributeError:
        model = models.mobilenet_v2(pretrained=True)

    # Freeze base feature extractor parameters
    for param in model.features.parameters():
        param.requires_grad = False

    # Replace classifier head: nn.Sequential(nn.Dropout(0.2), nn.Linear(1280, len(classes)))
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(0.2),
        nn.Linear(in_features, num_classes),
    )

    return model


def train_waste_classifier(
    dataset_dir: str = DATASET_DIR,
    num_epochs: int = 15,
    batch_size: int = 32,
    learning_rate: float = 0.001,
) -> None:
    """Main training routine for MobileNetV2 garbage classifier."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Using compute device: {device}")

    # Ensure dataset is available
    download_dataset(dataset_dir)
    effective_data_dir = locate_dataset_root(dataset_dir)
    print(f"[INFO] Loading dataset from: {effective_data_dir}")

    if not os.path.exists(effective_data_dir):
        print(f"[ERROR] Dataset directory not found: {effective_data_dir}")
        return

    # Load raw dataset without transform first to allow separate subset transforms
    raw_dataset = ImageFolder(root=effective_data_dir, transform=None)
    classes = raw_dataset.classes
    print(f"[INFO] Detected {len(classes)} classes: {classes}")

    if len(classes) == 0:
        print(f"[ERROR] No image classes found in {effective_data_dir}. Please populate dataset folders.")
        return

    # Train / Val / Test split: 70% train, 15% val, 15% test
    total_len = len(raw_dataset)
    train_len = int(0.70 * total_len)
    val_len = int(0.15 * total_len)
    test_len = total_len - train_len - val_len

    generator = torch.Generator().manual_seed(42)
    train_sub, val_sub, test_sub = torch.utils.data.random_split(
        raw_dataset, [train_len, val_len, test_len], generator=generator
    )

    train_tf, eval_tf = get_transforms()
    train_dataset = TransformSubset(train_sub, train_tf)
    val_dataset = TransformSubset(val_sub, eval_tf)
    test_dataset = TransformSubset(test_sub, eval_tf)

    # Compute class weights for WeightedRandomSampler to handle class imbalance
    train_targets = [raw_dataset.targets[i] for i in train_sub.indices]
    class_counts = np.bincount(train_targets, minlength=len(classes))
    print(f"[INFO] Training set class distribution: {dict(zip(classes, class_counts))}")

    # Avoid division by zero
    class_weights = 1.0 / np.maximum(class_counts, 1)
    sample_weights = [class_weights[target] for target in train_targets]
    sampler = WeightedRandomSampler(
        weights=torch.DoubleTensor(sample_weights),
        num_samples=len(sample_weights),
        replacement=True,
    )

    train_loader = DataLoader(train_dataset, batch_size=batch_size, sampler=sampler, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # Build model, criterion, optimizer, scheduler
    model = build_model(num_classes=len(classes))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", patience=2, factor=0.5)

    os.makedirs(MODEL_DIR, exist_ok=True)
    best_val_acc = 0.0

    print("\n[INFO] Starting training...")
    for epoch in range(1, num_epochs + 1):
        # Training phase
        model.train()
        running_loss = 0.0
        running_correct = 0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()

            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            _, preds = torch.max(outputs, 1)
            running_correct += torch.sum(preds == targets.data).item()

        epoch_loss = running_loss / len(train_sub)
        epoch_acc = running_correct / len(train_sub)

        # Validation phase
        model.eval()
        val_loss = 0.0
        val_correct = 0

        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)

                val_loss += loss.item() * inputs.size(0)
                _, preds = torch.max(outputs, 1)
                val_correct += torch.sum(preds == targets.data).item()

        val_loss = val_loss / len(val_sub)
        val_acc = val_correct / len(val_sub)
        scheduler.step(val_acc)

        print(
            f"Epoch [{epoch:02d}/{num_epochs:02d}] "
            f"Train Loss: {epoch_loss:.4f} Acc: {epoch_acc * 100:.2f}% | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc * 100:.2f}%"
        )

        # Save best model based on validation accuracy
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), MODEL_SAVE_PATH)
            print(f" -> Best model saved with Val Acc: {best_val_acc * 100:.2f}%")

    print("\n[INFO] Training complete. Evaluating on test set...")
    # Load best checkpoint for testing
    if os.path.exists(MODEL_SAVE_PATH):
        model.load_state_dict(torch.load(MODEL_SAVE_PATH, map_location=device))

    model.eval()
    y_true = []
    y_pred = []

    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            y_true.extend(targets.cpu().numpy().tolist())
            y_pred.extend(preds.cpu().numpy().tolist())

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    test_accuracy = (y_true == y_pred).mean() * 100.0 if len(y_true) > 0 else 0.0

    print("=" * 60)
    print(f"TEST ACCURACY: {test_accuracy:.2f}%")
    print("=" * 60)
    print("\nCLASSIFICATION REPORT:")
    print(classification_report(y_true, y_pred, target_names=classes, digits=4, zero_division=0))

    # Confusion matrix visualization
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=classes,
        yticklabels=classes,
    )
    plt.title("Waste Classification Confusion Matrix")
    plt.xlabel("Predicted Class")
    plt.ylabel("True Class")
    plt.tight_layout()
    plt.savefig(CONFUSION_MATRIX_PATH, dpi=300)
    plt.close()
    print(f"[INFO] Confusion matrix saved to: {CONFUSION_MATRIX_PATH}")

    # Save class labels JSON
    with open(CLASS_LABELS_PATH, "w", encoding="utf-8") as f:
        json.dump(classes, f, indent=2)
    print(f"[INFO] Class labels saved to: {CLASS_LABELS_PATH}")

    # Save bio mapping JSON (harmonized with classes)
    final_bio_mapping = {cls_name: BIO_MAPPING.get(cls_name.lower(), "Non-bio-degradable") for cls_name in classes}
    with open(BIO_MAPPING_PATH, "w", encoding="utf-8") as f:
        json.dump(final_bio_mapping, f, indent=2)
    print(f"[INFO] Bio mapping saved to: {BIO_MAPPING_PATH}")


if __name__ == "__main__":
    train_waste_classifier()
