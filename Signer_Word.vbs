Set objWord = CreateObject("Word.Application")
objWord.Visible = False ' Le travail se fait en arrière-plan

Set fso = CreateObject("Scripting.FileSystemObject")
strFolder = CreateObject("WScript.Shell").SpecialFolders("Desktop") & "\Gestion_Chantier\A_Signer"
strOutput = CreateObject("WScript.Shell").SpecialFolders("Desktop") & "\Gestion_Chantier\Fin_de_course"
strSig = CreateObject("WScript.Shell").SpecialFolders("Desktop") & "\Gestion_Chantier\signature.png"

For Each file In fso.GetFolder(strFolder).Files
    If LCase(fso.GetExtensionName(file.Name)) = "pdf" Then
        ' Word ouvre le PDF (il sait le convertir tout seul)
        Set objDoc = objWord.Documents.Open(file.Path)
        
        ' On insère la signature à la fin
        Set objSelection = objWord.Selection
        objSelection.EndKey 6 ' Va à la fin du document
        objDoc.Shapes.AddPicture(strSig)
        
        ' On ré-enregistre en PDF dans "Fin de course"
        objDoc.ExportAsFixedFormat strOutput & "\SIGNE_" & fso.GetBaseName(file.Name) & ".pdf", 17
        
        objDoc.Close False
        fso.DeleteFile(file.Path) ' On nettoie le dossier d'entrée
    End If
Next

objWord.Quit
MsgBox "Test terminé ! 100 fichiers signés dans Fin de course."