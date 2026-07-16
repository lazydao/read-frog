import { Icon } from "@iconify/react"
import { useMutation } from "@tanstack/react-query"
import { useAtomValue, useSetAtom } from "jotai"
import { useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/base-ui/alert-dialog"
import { Button } from "@/components/ui/base-ui/button"
import { Input } from "@/components/ui/base-ui/input"
import { Label } from "@/components/ui/base-ui/label"
import { useExportConfig } from "@/hooks/use-export-config"
import { configAtom, writeConfigAtom } from "@/utils/atoms/config"
import { addBackup } from "@/utils/backup/storage"
import { parseConfigTransferFile } from "@/utils/config/transfer"
import { EXTENSION_VERSION } from "@/utils/constants/app"
import { CONFIG_SCHEMA_VERSION } from "@/utils/constants/config"
import { i18n } from "@/utils/i18n"
import { ConfigCard } from "../../components/config-card"

export function ConfigTransfer() {
  return (
    <ConfigCard
      id="config-transfer"
      title={i18n.t("options.config.sync.title")}
      description={i18n.t("options.config.sync.description")}
    >
      <div className="flex w-full justify-end gap-3">
        <ImportConfig />
        <ExportConfig />
      </div>
    </ConfigCard>
  )
}

function ImportConfig() {
  const currentConfig = useAtomValue(configAtom)
  const setConfig = useSetAtom(writeConfigAtom)

  const { mutate: importConfig, isPending: isImporting } = useMutation({
    mutationFn: async (file: File) => {
      const importedConfig = await parseConfigTransferFile(await file.text())
      await addBackup(currentConfig, EXTENSION_VERSION)
      await setConfig(importedConfig)
    },
    onSuccess: () => {
      toast.success(i18n.t("options.config.sync.importSuccess"))
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : i18n.t("options.config.sync.importError")
      toast.error(`${i18n.t("options.config.sync.importError")}: ${message}`)
    },
  })

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      importConfig(file)
    }
    event.target.value = ""
  }

  return (
    <Button variant="outline" className="p-0" disabled={isImporting}>
      <Label htmlFor="import-config-file" className="w-full cursor-pointer px-3">
        <Icon icon="tabler:file-import" className="size-4" />
        {i18n.t("options.config.sync.import")}
      </Label>
      <Input
        type="file"
        id="import-config-file"
        className="hidden"
        accept="application/json,.json"
        onChange={handleImportConfig}
      />
    </Button>
  )
}

function ExportConfig() {
  const [open, setOpen] = useState(false)
  const config = useAtomValue(configAtom)
  const { mutate: exportConfig, isPending: isExporting } = useExportConfig({
    config,
    schemaVersion: CONFIG_SCHEMA_VERSION,
  })

  const handleExport = (includeAPIKeys: boolean) => {
    exportConfig(includeAPIKeys, { onSettled: () => setOpen(false) })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button disabled={isExporting} />}>
        <Icon icon="tabler:file-export" className="size-4" />
        {i18n.t("options.config.sync.export")}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{i18n.t("options.config.sync.exportOptions.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {i18n.t("options.config.sync.exportOptions.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex justify-between!">
          <AlertDialogCancel>
            {i18n.t("options.config.sync.exportOptions.cancel")}
          </AlertDialogCancel>
          <div className="flex gap-2">
            <AlertDialogAction
              variant="secondary"
              onClick={() => handleExport(true)}
              disabled={isExporting}
            >
              {i18n.t("options.config.sync.exportOptions.includeAPIKeys")}
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleExport(false)} disabled={isExporting}>
              {i18n.t("options.config.sync.exportOptions.excludeAPIKeys")}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
