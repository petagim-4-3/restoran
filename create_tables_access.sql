-- Access (Jet) SQL: create tables for frontend example (MenuItems, Orders, OrderItems, Companies, Employees, Roles)
-- Compatible with Access 2016 (.accdb)

-- MenuItems
CREATE TABLE MenuItems (
  MenuItemID COUNTER PRIMARY KEY,
  Name TEXT(200),
  Price CURRENCY,
  Unit TEXT(50),
  Category TEXT(50)
);

-- Companies
CREATE TABLE Companies (
  CompanyID COUNTER PRIMARY KEY,
  Name TEXT(255),
  Address TEXT(255),
  JIB TEXT(50),
  PIB TEXT(50),
  IBFM TEXT(50)
);

-- Roles
CREATE TABLE Roles (
  RoleID COUNTER PRIMARY KEY,
  Name TEXT(100),
  Description MEMO
);

-- Employees
CREATE TABLE Employees (
  EmployeeID COUNTER PRIMARY KEY,
  FirstName TEXT(100),
  LastName TEXT(100),
  RoleID LONG,
  HireDate DATETIME,
  Salary CURRENCY,
  Email TEXT(100),
  Phone TEXT(50),
  [Username] TEXT(50),
  PasswordHash TEXT(255)
);

-- Orders
CREATE TABLE Orders (
  OrderID COUNTER PRIMARY KEY,
  CustomerName TEXT(200),
  CustomerPhone TEXT(50),
  CustomerEmail TEXT(100),
  [Location] TEXT(50),
  TableNumber INTEGER,
  PaymentMethod TEXT(50),
  CardHolder TEXT(200),
  IsDraft YESNO,
  CreatedAt DATETIME,
  TotalNet CURRENCY,
  TotalVAT CURRENCY,
  TotalGross CURRENCY,
  CompanyID LONG,
  Operator TEXT(100)
);

-- OrderItems
CREATE TABLE OrderItems (
  OrderItemID COUNTER PRIMARY KEY,
  OrderID LONG,
  MenuItemID LONG,
  NameSnapshot TEXT(200),
  UnitPrice CURRENCY,
  Quantity DOUBLE,
  Unit TEXT(50),
  VATPercent DOUBLE,
  LineTotal CURRENCY
);

-- Note: If ALTER TABLE foreign key statements fail in Access SQL view, create relationships using Database Tools -> Relationships and enable Enforce Referential Integrity.