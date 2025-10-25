Option Compare Database
Option Explicit

' Late-binding version of export_and_helpers.bas
' Use this if you cannot enable DAO/ACE references or if you get "user-defined type not defined"
' Import this module (or paste into a new Module) and then Debug -> Compile Project.

' ----- HELPER FUNCTIONS -----
Private Function JsonEscape(s As Variant) As String
    If IsNull(s) Then
        JsonEscape = ""
        Exit Function
    End If
    Dim t As String
    t = CStr(s)
    t = Replace(t, "\", "\\")
    t = Replace(t, """", "\""")
    t = Replace(t, vbCrLf, "\n")
    t = Replace(t, vbCr, "\n")
    t = Replace(t, vbLf, "\n")
    JsonEscape = t
End Function

Private Function IsoNow() As String
    IsoNow = Format(Now(), "yyyy-mm-dd\THH:nn:ss")
End Function

' ----- EXPORT ORDER TO JSON (late binding) -----
' Public name matches original so forms/buttons don't need changes.
Public Sub ExportOrderToJSON(ByVal orderId As Long)
    On Error GoTo ErrHandler
    Dim db As Object
    Dim rsOrder As Object
    Dim rsItems As Object
    Dim json As String
    Dim filePath As String
    Dim fnum As Integer

    Set db = CurrentDb() ' returns a DAO Database object; late-bound as Object
    Set rsOrder = db.OpenRecordset("SELECT * FROM Orders WHERE OrderID = " & orderId)
    If rsOrder Is Nothing Then
        MsgBox "Unable to open Orders recordset.", vbExclamation
        GoTo Cleanup
    End If
    If rsOrder.EOF Then
        MsgBox "Order not found (OrderID=" & orderId & ")", vbExclamation
        GoTo Cleanup
    End If

    rsOrder.MoveFirst
    json = "{"
    json = json & """customer_name"":""" & JsonEscape(rsOrder!CustomerName) & ""","
    json = json & """customer_phone"":""" & JsonEscape(rsOrder!CustomerPhone) & ""","
    json = json & """customer_email"":""" & JsonEscape(rsOrder!CustomerEmail) & ""","
    json = json & """location"":""" & JsonEscape(rsOrder![Location]) & ""","
    json = json & """table_number"":" & Nz(rsOrder!TableNumber, 0) & ","
    json = json & """payment_method"":""" & JsonEscape(rsOrder!PaymentMethod) & ""","
    json = json & """created_at"":""" & JsonEscape(rsOrder!CreatedAt) & ""","

    json = json & """items"":["

    Set rsItems = db.OpenRecordset("SELECT oi.*, m.Name AS MenuName, m.Price AS MenuPrice FROM OrderItems oi LEFT JOIN MenuItems m ON oi.MenuItemID = m.MenuItemID WHERE oi.OrderID = " & orderId)
    If Not (rsItems Is Nothing) Then
        If Not rsItems.EOF Then
            rsItems.MoveFirst
            Do While Not rsItems.EOF
                json = json & "{"
                json = json & """dish_id"":" & Nz(rsItems!MenuItemID, 0) & ","
                json = json & """quantity"":" & Nz(rsItems!Quantity, 0) & ","
                json = json & """name"":""" & JsonEscape(Nz(rsItems!MenuName, rsItems!NameSnapshot)) & ""","
                json = json & """unit_price"":" & Format(Nz(rsItems!UnitPrice, Nz(rsItems!MenuPrice, 0)), "0.00")
                json = json & "},"
                rsItems.MoveNext
            Loop
            ' remove trailing comma if present
            If Right(json, 1) = "," Then json = Left(json, Len(json) - 1)
        End If
    End If

    json = json & "]"
    json = json & "}"

    filePath = CurrentProject.Path & "\narudzba_" & orderId & "_" & Format(Now(), "yyyymmdd_hhnnss") & ".json"
    fnum = FreeFile
    Open filePath For Output As #fnum
    Print #fnum, json
    Close #fnum

    MsgBox "JSON saved: " & filePath, vbInformation

Cleanup:
    On Error Resume Next
    If Not rsItems Is Nothing Then rsItems.Close
    If Not rsOrder Is Nothing Then rsOrder.Close
    Set rsItems = Nothing
    Set rsOrder = Nothing
    Set db = Nothing
    Exit Sub

ErrHandler:
    MsgBox "Error in ExportOrderToJSON: " & Err.Description, vbCritical
    Resume Cleanup
End Sub

' ----- RECALCULATE TOTALS (late binding) -----
' Public name matches original so forms/buttons don't need changes.
Public Sub RecalculateTotals(ByVal orderId As Long)
    On Error GoTo ErrHandler
    Dim db As Object
    Dim rsItems As Object
    Dim rs As Object
    Dim subtotal As Currency
    Dim totalVAT As Currency
    Dim totalGross As Currency
    Dim vatRate As Double
    Dim lineNet As Currency
    Dim lineVat As Currency

    Set db = CurrentDb()
    Set rsItems = db.OpenRecordset("SELECT Quantity, UnitPrice, VATPercent FROM OrderItems WHERE OrderID = " & orderId)
    subtotal = 0
    totalVAT = 0

    If Not (rsItems Is Nothing) Then
        If Not rsItems.EOF Then
            rsItems.MoveFirst
            Do While Not rsItems.EOF
                lineNet = Nz(rsItems!UnitPrice, 0) * Nz(rsItems!Quantity, 0)
                vatRate = Nz(rsItems!VATPercent, 17) / 100
                lineVat = lineNet * vatRate
                subtotal = subtotal + lineNet
                totalVAT = totalVAT + lineVat
                rsItems.MoveNext
            Loop
        End If
    End If

    totalGross = subtotal + totalVAT

    Set rs = db.OpenRecordset("SELECT * FROM Orders WHERE OrderID = " & orderId)
    If Not (rs Is Nothing) Then
        If Not rs.EOF Then
            rs.Edit
            rs!TotalNet = subtotal
            rs!TotalVAT = totalVAT
            rs!TotalGross = totalGross
            rs.Update
        End If
    End If

Cleanup:
    On Error Resume Next
    If Not rsItems Is Nothing Then rsItems.Close
    If Not rs Is Nothing Then rs.Close
    Set rsItems = Nothing
    Set rs = Nothing
    Set db = Nothing
    Exit Sub

ErrHandler:
    MsgBox "Error in RecalculateTotals: " & Err.Description, vbCritical
    Resume Cleanup
End Sub

' ----- POPULATE TABLES COMBO (unchanged) -----
Public Sub PopulateTablesCombo(frm As Form, ByVal locationControlName As String, ByVal tableControlName As String)
    On Error GoTo ErrHandler
    Dim loc As String
    loc = Nz(frm.Controls(locationControlName).Value, "")

    Select Case LCase(loc)
        Case "terasa"
            frm.Controls(tableControlName).RowSource = "1;2;3;4;5;6;7;8;9;10"
        Case "restoran"
            frm.Controls(tableControlName).RowSource = "1;2;3;4;5;6;7;8;9;10"
        Case Else
            frm.Controls(tableControlName).RowSource = ""
    End Select
    frm.Controls(tableControlName).Requery
    Exit Sub

ErrHandler:
    Resume Next
End Sub