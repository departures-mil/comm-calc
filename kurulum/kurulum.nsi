; Genel Windows kurulum sihirbazı (Türkçe / English / العربية) — GitHub Actions'ta üretilir.
; makensis -DNAME=.. -DEXE=.. -DSRC=<exe yolu> -DVERSION=1.2.3 -DREGKEY=.. -DOUT=<çıktı.exe> [-DICON=<ico>] kurulum.nsi
; -DDIR verilirse SRC bir klasördür (Electron win-unpacked) ve içeriğinin tamamı kurulur.
; Kullanıcı başına kurulur (yönetici izni gerekmez). Eski sürümün üstüne temizce kurulur, kayıtlara dokunmaz.
Unicode true
SetCompressor /SOLID lzma
RequestExecutionLevel user

!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${REGKEY}"

Name "${NAME}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\${REGKEY}"
InstallDirRegKey HKCU "Software\${REGKEY}" "InstallDir"
BrandingText "${NAME} ${VERSION}"
VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=1033 "ProductName" "${NAME}"
VIAddVersionKey /LANG=1033 "FileDescription" "${NAME} Kurulum / Setup"
VIAddVersionKey /LANG=1033 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1033 "LegalCopyright" "${NAME}"

!include MUI2.nsh
!ifdef ICON
  !define MUI_ICON "${ICON}"
  !define MUI_UNICON "${ICON}"
!endif
!define MUI_ABORTWARNING
!define MUI_LANGDLL_ALLLANGUAGES
!define MUI_LANGDLL_REGISTRY_ROOT HKCU
!define MUI_LANGDLL_REGISTRY_KEY "Software\${REGKEY}"
!define MUI_LANGDLL_REGISTRY_VALUENAME "InstallerLanguage"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Turkish"
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_RESERVEFILE_LANGDLL

Function .onInit
  !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd

Function un.onInit
  !insertmacro MUI_UNGETLANGUAGE
FunctionEnd

Section "Install"
  SetShellVarContext current
  ; Açık program varsa kapat ki üstüne yazılabilsin
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 800
  SetOutPath "$INSTDIR"
  !ifdef DIR
    File /r "${SRC}\*.*"
  !else
    File "/oname=${EXE}" "${SRC}"
  !endif
  !ifdef ICON
    File "/oname=icon.ico" "${ICON}"
  !endif
  CreateShortCut "$DESKTOP\${NAME}.lnk" "$INSTDIR\${EXE}"
  CreateDirectory "$SMPROGRAMS\${NAME}"
  CreateShortCut "$SMPROGRAMS\${NAME}\${NAME}.lnk" "$INSTDIR\${EXE}"
  CreateShortCut "$SMPROGRAMS\${NAME}\Kaldır - Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\${REGKEY}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "${NAME}"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "${NAME}"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  ; Kayıtlar (AppData) silinmez, yalnız program dosyaları kaldırılır
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Delete "$DESKTOP\${NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${NAME}"
  Delete "$INSTDIR\${EXE}"
  !ifdef DIR
    ; Yalnız program dosyaları; programın yanındaki veri klasörlerine dokunulmaz
    RMDir /r "$INSTDIR\resources"
    RMDir /r "$INSTDIR\locales"
    Delete "$INSTDIR\*.dll"
    Delete "$INSTDIR\*.pak"
    Delete "$INSTDIR\*.bin"
    Delete "$INSTDIR\*.dat"
    Delete "$INSTDIR\LICENSE*"
  !endif
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
SectionEnd
