CREATE TABLE MenuItems (
  MenuItemID COUNTER PRIMARY KEY,
  Name TEXT(200),
  Price CURRENCY,
  Unit TEXT(50),
  Category TEXT(50)
);

CREATE TABLE Companies (
  CompanyID COUNTER PRIMARY KEY,
  Name TEXT(255),
  Address TEXT(255),
  JIB TEXT(50),
  PIB TEXT(50),
  IBFM TEXT(50)
);

CREATE TABLE Roles (
  RoleID COUNTER PRIMARY KEY,
  Name TEXT(100),
  Description MEMO
);

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

ALTER TABLE Orders ADD CONSTRAINT FK_Orders_Companies FOREIGN KEY (CompanyID) REFERENCES Companies(CompanyID);
ALTER TABLE OrderItems ADD CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderID) REFERENCES Orders(OrderID);
ALTER TABLE OrderItems ADD CONSTRAINT FK_OrderItems_MenuItems FOREIGN KEY (MenuItemID) REFERENCES MenuItems(MenuItemID);
ALTER TABLE Employees ADD CONSTRAINT FK_Employees_Roles FOREIGN KEY (RoleID) REFERENCES Roles(RoleID);