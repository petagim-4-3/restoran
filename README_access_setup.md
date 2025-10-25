# Access 2016 setup — Restoran (frontend example)

This README explains how to use the files in the `access-skeleton` branch to create a working Microsoft Access 2016 (.accdb) example that matches the frontend-only example in `frontend/`.

Files included in this branch:
- `create_tables_access.sql` — SQL (Access/Jet) to create tables: MenuItems, Orders, OrderItems, Companies, Employees, Roles.
- `export_and_helpers.bas` — VBA module with ExportOrderToJSON, RecalculateTotals, PopulateTablesCombo and helpers.
- `menu_sample.csv` — sample menu rows (10 dishes) for quick import.
- `sample_orders.json` — 1–2 example orders in the same JSON shape as the frontend output.

Prerequisites
- Microsoft Access 2016 installed on your Windows PC.
- The empty database file you placed in this branch: `access-skeleton/restoran-prazna-db.accdb`.

Step-by-step setup

1. Clone or download the repository and switch to the `access-skeleton` branch.
2. Copy `restoran-prazna-db.accdb` locally and open it with Access 2016.

3. Create tables using the SQL script
   - In Access: Go to Create → Query Design → Close the "Show Table" dialog → View → SQL View.
   - Open `create_tables_access.sql` in a text editor, copy all SQL, paste into SQL View and run (Run → red exclamation). If Access complains about foreign key ALTER statements, run only the CREATE TABLE sections first and then create relationships in the Relationships window (Database Tools → Relationships).

4. Import sample menu data (quick method)
   - In Access: External Data → New Data Source → From File → Text File.
   - Select `menu_sample.csv` from the repo files, choose "Import the source data into a new table in the current database", follow the wizard. Map columns to `MenuItems.Name`, `MenuItems.Price`, `MenuItems.Unit`, `MenuItems.Category`. You can ignore MenuItemID and let Access autogenerate it.

5. Add the VBA module
   - In Access: press ALT+F11 to open the VBA editor.
   - Insert → Module. Open `export_and_helpers.bas` from the repo and paste its contents into the module. Save the module as `ExportHelpers`.
   - In VBA Editor: Tools → References → ensure the following references are checked (for DAO and RegExp if used):
     - Microsoft Office 16.0 Access database engine Object Library (usually present)
     - Microsoft DAO 3.6 Object Library (or the Access 16.x DAO library)
     - (Optional) Microsoft VBScript Regular Expressions 5.5 — if you use regex in form validation.

6. Create forms
   - Create the main Order form:
     - Create → Form Design. In the property sheet set Record Source to `Orders`.
     - Add controls bound to fields: CustomerName, CustomerPhone, CustomerEmail, Location, TableNumber, PaymentMethod, CardHolder, IsDraft, CreatedAt, TotalNet, TotalVAT, TotalGross, Operator.
     - For Location use a ComboBox with values: `terasa;restoran`.
     - For TableNumber use a ComboBox. Leave Row Source empty; use the `PopulateTablesCombo` routine in Location's AfterUpdate event to populate it.
     - Add command buttons: Save Draft, Finalize Order, Export JSON, Generate Receipt.
   - Create a subform for OrderItems:
     - Create → Form Design. Set Record Source to `OrderItems`. Add fields: MenuItemID (use Lookup to MenuItems to display Name), UnitPrice, Quantity, VATPercent, LineTotal.
     - Save subform as `subOrderItems` (continuous or datasheet view).
     - Add the subform into frmOrder and set Link Master Fields / Link Child Fields = OrderID.

7. Wire up VBA events (examples)
   - Save Draft button: `Me.IsDraft = True` → `DoCmd.RunCommand acCmdSaveRecord` → MsgBox.
   - Finalize button: `Me.IsDraft = False` → `DoCmd.RunCommand acCmdSaveRecord` → `RecalculateTotals Me.OrderID`.
   - Export JSON button: `ExportOrderToJSON Me.OrderID`.
   - Location AfterUpdate event: `PopulateTablesCombo Me, "Location", "TableNumber"`.
   - In the subform's AfterUpdate (or Quantity/UnitPrice AfterUpdate) call code to recalc LineTotal: `Me.LineTotal = Nz(Me.UnitPrice,0) * Nz(Me.Quantity,0)` and then call `RecalculateTotals Me.Parent.OrderID`.

8. Create the receipt report
   - Create → Report Wizard. Use a query joining OrderItems and MenuItems filtered by OrderID (or open the report from frmOrder with a WHERE clause: DoCmd.OpenReport "rptReceipt", acViewPreview, , "OrderID=" & Me.OrderID).
   - In the report footer, place calculated controls for Subtotal (Sum of LineTotal), PDV (Subtotal * 0.17) and Total.

9. Import sample orders (optional)
   - `sample_orders.json` included for reference. You can load it manually: create new Orders records and corresponding OrderItems.

10. Test flow
   - Open frmOrder and create a draft: enter customer, location, choose items and quantities in the subform, click Save Draft.
   - Use Export JSON to save a JSON file (created in the same folder as the .accdb).
   - Finalize the order and Generate Receipt (open and print the report).

Security note
- Do NOT store card PAN or CVC in the database. The sample schema only stores CardHolder name (no card number or CVC). If you must handle real payments, integrate with a PCI‑compliant PSP and tokenization.

Support
- If you want, I can prepare a filled `.accdb` and a zipped Release with everything already prepared. For that I will need the updated `.accdb` uploaded back to the repo or a copy available to me to commit.