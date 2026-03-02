# ============================================================
# DATASET RUNNER — Reads sample_dataset.csv and runs ALL models
# No dataset needed from you — we load from the CSV file.
# Run:  python python_models/run_dataset.py
# ============================================================

import csv
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from textModel     import run_text_model
from anomalyModel  import run_anomaly_model
from metadataModel import run_metadata_model
from contentModel  import run_content_model


def get_risk_level(score: int) -> str:
    if score < 25: return "LOW      ✅"
    if score < 50: return "MEDIUM   🟡"
    if score < 75: return "HIGH     ⚠️ "
    return             "CRITICAL 🚨"


def load_dataset(csv_path: str) -> list:
    """Load jobs from a CSV file."""
    jobs = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            jobs.append({
                "title":        row.get("title", ""),
                "company":      row.get("company", ""),
                "location":     row.get("location", ""),
                "salary":       row.get("salary", ""),
                "email":        row.get("email", ""),
                "description":  row.get("description", ""),
                "requirements": row.get("requirements", ""),
            })
    return jobs


def run_all_models_on_dataset(csv_path: str):
    """Load dataset and run each model separately on every row."""

    jobs = load_dataset(csv_path)
    total = len(jobs)

    print("\n" + "█" * 70)
    print(f"  AI FRAUD DETECTION — Dataset Runner")
    print(f"  Dataset: {csv_path}")
    print(f"  Total Jobs: {total}")
    print("█" * 70)

    # ─────────────────────────────────────────────────────────────────
    # MODEL 1: RoBERTa Text Analyzer — run separately on all jobs
    # ─────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  MODEL 1: RoBERTa Text Analyzer")
    print("=" * 70)
    print(f"  {'#':<3} {'Job Title':<35} {'Company':<20} {'Score':>7}")
    print("  " + "-" * 66)

    for i, job in enumerate(jobs, 1):
        result = run_text_model(job)
        risk   = get_risk_level(result.score)
        print(f"  {i:<3} {job['title'][:34]:<35} {job['company'][:19]:<20} {result.score:>3}/100  {risk}")

    # ─────────────────────────────────────────────────────────────────
    # MODEL 2: Isolation Forest Anomaly Detector
    # ─────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  MODEL 2: Isolation Forest Anomaly Detector")
    print("=" * 70)
    print(f"  {'#':<3} {'Job Title':<35} {'Company':<20} {'Score':>7}")
    print("  " + "-" * 66)

    for i, job in enumerate(jobs, 1):
        result = run_anomaly_model(job)
        risk   = get_risk_level(result.score)
        print(f"  {i:<3} {job['title'][:34]:<35} {job['company'][:19]:<20} {result.score:>3}/100  {risk}")

    # ─────────────────────────────────────────────────────────────────
    # MODEL 3: Metadata Neural Network
    # ─────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  MODEL 3: Metadata Neural Network")
    print("=" * 70)
    print(f"  {'#':<3} {'Job Title':<35} {'Company':<20} {'Score':>7}  {'Sal':>3} {'Eml':>3} {'Loc':>3} {'Co':>3}")
    print("  " + "-" * 66)

    for i, job in enumerate(jobs, 1):
        result = run_metadata_model(job)
        risk   = get_risk_level(result.score)
        s = "⚠️" if result.salary_flag   else "✅"
        e = "⚠️" if result.email_flag    else "✅"
        l = "⚠️" if result.location_flag else "✅"
        c = "⚠️" if result.company_flag  else "✅"
        print(f"  {i:<3} {job['title'][:34]:<35} {job['company'][:19]:<20} {result.score:>3}/100  {s} {e} {l} {c}")

    # ─────────────────────────────────────────────────────────────────
    # MODEL 4: Combined Content Analyzer
    # ─────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  MODEL 4: Combined Content Analyzer (Text 75% + Anomaly 25%)")
    print("=" * 70)
    print(f"  {'#':<3} {'Job Title':<35} {'Company':<20} {'Txt':>4} {'Ano':>4} {'Fused':>6}")
    print("  " + "-" * 66)

    for i, job in enumerate(jobs, 1):
        result = run_content_model(job)
        risk   = get_risk_level(result.score)
        print(f"  {i:<3} {job['title'][:34]:<35} {job['company'][:19]:<20} {result.text_sub_score:>3}  {result.anomaly_sub_score:>3}  {result.score:>4}/100  {risk}")

    # ─────────────────────────────────────────────────────────────────
    # FINAL: Combined All Models → Final Fraud Score
    # ─────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  ★ FINAL RESULT: All Models Combined (Content 70% + Metadata 30%)")
    print("=" * 70)
    print(f"  {'#':<3} {'Job Title':<32} {'Content':>8} {'Metadata':>9} {'FINAL':>7}  {'VERDICT'}")
    print("  " + "-" * 70)

    fraud_count = 0
    safe_count  = 0
    results_list = []

    for i, job in enumerate(jobs, 1):
        content  = run_content_model(job)
        metadata = run_metadata_model(job)
        final    = max(0, min(100, round(0.7 * content.score + 0.3 * metadata.score)))
        is_fraud = final >= 50
        verdict  = "🔴 FRAUD" if is_fraud else "🟢 SAFE "
        if is_fraud: fraud_count += 1
        else:         safe_count  += 1
        results_list.append(final)
        print(f"  {i:<3} {job['title'][:31]:<32} {content.score:>6}/100  {metadata.score:>7}/100  {final:>5}/100  {verdict}")

    avg = round(sum(results_list) / len(results_list))
    print("  " + "─" * 70)
    print(f"\n  📊 SUMMARY:")
    print(f"     Total jobs analyzed : {total}")
    print(f"     🔴 Fraud detected    : {fraud_count}")
    print(f"     🟢 Safe / Legitimate : {safe_count}")
    print(f"     📈 Average score     : {avg}/100")
    print(f"\n✅ Dataset analysis complete.\n")


# ── Entry point ──
if __name__ == "__main__":
    dataset_path = os.path.join(os.path.dirname(__file__), "sample_dataset.csv")

    # Allow custom CSV path: python run_dataset.py my_jobs.csv
    if len(sys.argv) > 1:
        dataset_path = sys.argv[1]

    if not os.path.exists(dataset_path):
        print(f"❌ Dataset file not found: {dataset_path}")
        sys.exit(1)

    run_all_models_on_dataset(dataset_path)
