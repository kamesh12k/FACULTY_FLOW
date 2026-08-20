# FAFLOW — Data Retention & Selective Purge Guide

**Document Revision:** 1.0  
**Audience:** System Administrator / Department Super Admin  

---

## 1. Overview

FAFLOW features an integrated **Data Lifecycle, Retention & Selective Data Purge** system designed to help administrators maintain peak database performance, meet regulatory storage compliance, and cleanly manage historical academic records.

The system provides two core capabilities:
1. **Automated Data Retention Policies**: Scheduled background pruning of aged records based on customizable retention windows per entity.
2. **Selective Data Purge Console**: An interactive, safe UI allowing targeted bulk deletions with relative age filters, custom date ranges, pre-deletion impact simulation, automatic snapshot backups, and safety confirmation phrases.

---

## 2. Automated Retention Policies

Automated Data Retention executes background lifecycle tasks to prune aged records without manual intervention.

### Configurable Retention Thresholds

Administrators can set retention windows (in days) for each data category. Setting any threshold to `0` retains records indefinitely.

| Category | Default Window | Description |
|---|---|---|
| **Audit Logs** | 90 days | Security events, login history, and administrative audit trails |
| **In-app Notifications** | 30 days | User alerts, push subscriptions, and leave notifications |
| **Backup Archives** | 60 days | Historical JSON database backup files on disk |
| **Backup Max Count** | 10 backups | Keeps the newest $N$ backups and automatically prunes older ones |
| **Live Traffic Metrics** | 30 days | In-memory API request logs and response latency records |
| **Completed Leaves** | 365 days | Historical leave requests marked as Approved, Rejected, or Cancelled |
| **Credit Ledger Transactions** | 365 days | Past credit balance transaction logs |
| **Timetable Submissions** | 180 days | Historical teacher timetable submission reviews |

### Execution & Scheduling

- **Automated Frequency**: Configured in days (default: every 7 days). The system automatically evaluates and executes pruning during scheduled checks.
- **On-Demand Auto-Cleanup**: Admins can immediately trigger the auto-retention policy anytime via the **"Run Auto-Cleanup Now"** button or `POST /admin/data-retention/run-auto-cleanup`.

---

## 3. Selective Data Purge Console

Located at `/admin/data-retention` (or accessible via **Settings & History** and **Backup & Restore**), the Selective Purge console allows precise, controlled data management.

### Features:

1. **Target Selection**:
   Multi-select checkboxes with live record count badges across 8 primary datasets:
   - 📋 Audit Trail Logs
   - 🔔 In-app Notifications
   - 📊 Live Traffic & Performance Logs
   - 💾 System Backup Files
   - 🏖️ Leave Requests & Substitutions
   - 💳 Credit Ledger Transactions
   - 👥 Operational Staff Leaves
   - 📅 Timetable Submissions

2. **Flexible Filter Modes**:
   - **Older than X Days**: Relative age slider with quick presets (`7d`, `30d`, `60d`, `90d`, `180d`, `365d`).
   - **Custom Date Range**: Target records within a specific start and end calendar date range.
   - **All Records (Category Wipe)**: Cleanse the entire selected category.

3. **Purge Impact Simulation (Dry Run)**:
   - Clicking **"Preview Impact & Record Count"** safely calculates and displays the exact number of matching records per category without modifying the database.

4. **Safety Protections**:
   - **Pre-Purge Automatic Snapshot Backup**: Enabled by default. Generates a full database JSON archive before executing any deletions so data can be restored if needed.
   - **Confirmation Phrase Gate**: Requires the administrator to type `PURGE DATA` into the confirmation modal before deletion executes.
   - **Foreign-Key Safe Deletion Order**: Child records (such as substitute alter assignments and related transaction references) are cleaned before parent records to maintain database integrity.
   - **Comprehensive Audit Trail**: Every purge execution logs the initiator, timestamp, filter parameters, and deleted record counts.

---

## 4. Database Table & Storage Inspector

The **Table & Storage Inspector** tab provides real-time visibility into the system footprint:
- Record counts across all 17 core database tables (Users, Classes, Timetable Slots, Leaves, Credits, Notifications, Logs).
- Oldest and newest record timestamps per table.
- Filesystem backup archive counts and total storage footprint.

---

## 5. API Endpoints

All endpoints are mounted under `/admin/data-retention` and require Administrator privileges:

| Method | Endpoint | Access Control | Description |
|---|---|---|---|
| `GET` | `/admin/data-retention/stats` | Admin | Returns record counts across all core tables and storage metrics. |
| `GET` | `/admin/data-retention/policy` | Admin | Retrieves current retention configuration and scheduled status. |
| `PUT` | `/admin/data-retention/policy` | Super Admin | Updates retention windows and automated cleanup frequency. |
| `POST` | `/admin/data-retention/run-auto-cleanup` | Super Admin | Forces immediate execution of automated lifecycle cleanup. |
| `POST` | `/admin/data-retention/preview` | Admin | Simulates selective purge and returns exact impacted record counts. |
| `POST` | `/admin/data-retention/purge` | Super Admin | Executes selective deletion with pre-purge backup and safety verification. |
