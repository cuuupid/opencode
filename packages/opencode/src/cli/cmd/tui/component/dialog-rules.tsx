import { TextAttributes, TextareaRenderable, type KeyEvent } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "@tui/context/sdk"
import { createSignal, For, Show, onMount } from "solid-js"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"

type Rule = { id: string; content: string; tag?: string }

export function DialogRules() {
  const { theme } = useTheme()
  const dialog = useDialog()
  const sdk = useSDK()
  const dimensions = useTerminalDimensions()
  const [rules, setRules] = createSignal<Rule[]>([])
  const [adding, setAdding] = createSignal(false)
  let textarea: TextareaRenderable | undefined

  onMount(() => {
    dialog.setSize("large")
    refresh()
  })

  async function refresh() {
    const res = await sdk.fetch(sdk.url + "/memory/rule")
    const data = await res.json()
    setRules(data ?? [])
  }

  async function save() {
    if (!textarea) return
    const content = textarea.plainText.trim()
    if (!content) {
      setAdding(false)
      return
    }
    await sdk.fetch(sdk.url + "/memory/rule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    setAdding(false)
    refresh()
  }

  async function remove(id: string) {
    await sdk.fetch(sdk.url + "/memory/rule/" + id, { method: "DELETE" })
    refresh()
  }

  function startAdd() {
    setAdding(true)
    setTimeout(() => textarea?.focus(), 10)
  }

  useKeyboard((evt: KeyEvent) => {
    if (evt.name === "escape") {
      if (adding()) setAdding(false)
      else dialog.clear()
    }
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Memory Rules
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <text fg={theme.textMuted}>Rules are always injected into every conversation.</text>

      <scrollbox
        maxHeight={Math.floor(dimensions().height / 2)}
        verticalScrollbarOptions={{
          trackOptions: {
            backgroundColor: theme.background,
            foregroundColor: theme.borderActive,
          },
        }}
      >
        <box gap={1}>
          <Show
            when={rules().length > 0}
            fallback={
              <Show when={!adding()}>
                <text fg={theme.textMuted}>No rules yet.</text>
              </Show>
            }
          >
            <For each={rules()}>
              {(rule) => (
                <box flexDirection="row" gap={1} justifyContent="space-between">
                  <box flexDirection="row" gap={1} flexGrow={1}>
                    <text flexShrink={0} fg={theme.primary}>
                      •
                    </text>
                    <text fg={theme.text} wrapMode="word">
                      <Show when={rule.tag}>
                        <span style={{ fg: theme.accent }}>[{rule.tag}] </span>
                      </Show>
                      {rule.content}
                    </text>
                  </box>
                  <text flexShrink={0} fg={theme.textMuted} onMouseDown={() => remove(rule.id)}>
                    ✕
                  </text>
                </box>
              )}
            </For>
          </Show>
        </box>
      </scrollbox>

      <Show when={adding()}>
        <box gap={1}>
          <textarea
            ref={(val: TextareaRenderable) => (textarea = val)}
            height={3}
            placeholder="Type a rule and press enter..."
            textColor={theme.text}
            focusedTextColor={theme.text}
            cursorColor={theme.text}
            keyBindings={[{ name: "return", action: "submit" }]}
            onSubmit={save}
          />
          <box flexDirection="row" gap={2}>
            <text fg={theme.textMuted}>
              enter <span style={{ fg: theme.text }}>save</span>
            </text>
            <text fg={theme.textMuted}>
              esc <span style={{ fg: theme.text }}>cancel</span>
            </text>
          </box>
        </box>
      </Show>

      <Show when={!adding()}>
        <box
          flexDirection="row"
          gap={1}
          backgroundColor={theme.backgroundElement}
          paddingLeft={2}
          paddingRight={2}
          paddingTop={1}
          paddingBottom={1}
          onMouseDown={startAdd}
        >
          <text fg={theme.success}>+</text>
          <text fg={theme.text}>Add rule</text>
        </box>
      </Show>
    </box>
  )
}
