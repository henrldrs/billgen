# BillGen — Windows

Belgian invoicing, on your own computer. Your invoices, clients and backups
stay in a folder on your machine; nothing is uploaded anywhere.

**[Download the latest version →](../../releases/latest)**

---

## Before you install

**BillGen needs a licence file, and it will not open without one.** The licence
is issued for one specific computer, so downloading the installer is the second
step, not the first.

1. Ask for a licence: **contact@billgen.be**
2. You will be asked to run one command on the machine that will use BillGen,
   which prints a fingerprint — a code like `fb380-70da7-01e28-…`. It is a
   one-way hash of a Windows identifier; it is not your name, your address or
   anything that can be read back.
3. You receive a `.billgenlic` file. Put it in your BillGen data folder.

Installing without a licence is harmless — the application simply tells you
what is missing when it starts.

## Installing

Windows 10 or 11, 64-bit. Nothing else is required: Python, databases and the
PDF engine are either inside the installer or already part of Windows.

**Windows will warn you.** This installer is not yet signed with a certificate,
so SmartScreen shows *"Windows protected your PC"*. That warning means the
publisher is unverified, not that the file is unsafe. Choose **More info →
Run anyway** — or verify the download first, below, which is the better habit.
The warning goes away once the signing certificate is in place.

### Verify your download

Every release carries a `.sha256` file beside the installer. In PowerShell:

```powershell
Get-FileHash .\BillGen_x.y.z_x64-setup.exe -Algorithm SHA256
```

Compare it with the contents of the `.sha256` file. If they differ, do not run
the installer — tell us.

## Where your data lives

Everything BillGen keeps is in one folder you can see, copy and back up:

```
C:\Users\<you>\Documents\BillGen\
    billgen.db          your clients, invoices and payments
    invoices\<year>\    a PDF of every invoice you issue
    contracts\          anything you accepted in the app
    backups\            a dated archive, written each day BillGen opens
```

Deliberately **not** in `AppData`: that folder is hidden, and under some
installation methods Windows deletes it when an application is uninstalled.
Belgian law requires you to keep invoices for seven years, so they live
somewhere that survives the software.

Uninstalling BillGen leaves this folder exactly where it is.

## Your data is yours

BillGen has no servers. It does not phone home, collect usage statistics, or
send your clients' details anywhere. We hold your name, your e-mail address and
the licence we issued you — nothing else.

You can take everything with you at any time: **Settings → Backup** writes a
single encrypted archive containing your data *and* your invoice PDFs, opened
with a passphrase only you know.

## What is in this build

`THIRD-PARTY-NOTICES.txt`, attached to every release, lists every third-party
package inside BillGen and the licence it is redistributed under.

## Help

**contact@billgen.be**

This repository carries the downloads and this page. BillGen's source is not
public.
