import { createMemo } from "solid-js"
import { useSync } from "../context/sync"
import { useSDK } from "../context/sdk"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"

export function DialogDisconnect() {
  const sync = useSync()
  const sdk = useSDK()
  const dialog = useDialog()

  const options = createMemo((): DialogSelectOption<string>[] =>
    sync.data.provider
      .filter((p) => p.id !== "opencode" && p.id !== "opencode-go")
      .filter((p) => Object.keys(p.models).length > 0)
      .map((p) => ({
        title: p.id,
        value: p.id,
        description: `${Object.keys(p.models).length} models`,
      })),
  )

  return (
    <DialogSelect
      title="Disconnect provider"
      options={options()}
      onSelect={async (option) => {
        await sdk.client.auth.remove({ providerID: option.value })
        await sdk.client.instance.dispose()
        sync.bootstrap()
        dialog.clear()
      }}
    />
  )
}
