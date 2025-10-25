Option Compare Database
Option Explicit

' ----- Helper functions -----
Private Function JsonEscape(s As Variant) As String
    If IsNull(s) Then
        JsonEscape = ""
        Exit Function
    End If
    Dim t As String
    t = CStr(s)
    t = Replace(t, "\\", "\\\\")
    t = Replace(t, '"', '\"')
    t = Replace(t, vbCrLf, "\n")
    t = Replace(t, vbCr, "\n")
    t = Replace(t, vbLf, "\n")
    JsonEscape = t
End Function

Private Function IsoNow() As String
    IsoNow = Format(Now(), "yyyy-mm-dd\THH:nn:ss")
End Function

' ----- Export Order to JSON -----
Public Sub ExportOrderToJSON(ByVal orderId As Long)
    On Error GoTo ErrHandler
    Dim db As DAO.Database
    Dim rsOrder As DAO.Recordset
    Dim rsItems As DAO.Recordset
    Dim json As String
    Dim filePath As String
    Dim fnum As Integer
    Set db = CurrentDb
    Set rsOrder = db.OpenRecordset("SELECT * FROM Orders WHERE OrderID = " & orderId, dbOpenSnapshot)
    If rsOrder.EOF Then
        MsgBox "Order not found (OrderID=" & orderId & ")", vbExclamation
        GoTo Cleanup
    End If
    rsOrder.MoveFirst
    json = "{"
    json = json & ' basic fields
    json = json & "customer_name":"" & JsonEscape(rsOrder!CustomerName) & ""," & vbCrLf
    json = json & "customer_phone":"" & JsonEscape(rsOrder!CustomerPhone) & ""," & vbCrLf
    json = json & "customer_email":"" & JsonEscape(rsOrder!CustomerEmail) & ""," & vbCrLf
    json = json & "location":"" & JsonEscape(rsOrder![Location]) & ""," & vbCrLf
    json = json & "table_number":