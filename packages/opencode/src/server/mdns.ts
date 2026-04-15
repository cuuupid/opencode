import { Log } from "@/util/log"
import { Bonjour } from "bonjour-service"
import path from "path"

const log = Log.create({ service: "mdns" })

export namespace MDNS {
  let bonjour: Bonjour | undefined
  let currentPort: number | undefined

  export function publish(port: number, opts?: { domain?: string; name?: string; directory?: string }) {
    if (currentPort === port) return
    if (bonjour) unpublish()

    try {
      const host = opts?.domain ?? "iris.local"
      const dir = opts?.directory ?? process.cwd()
      const label = opts?.name ?? path.basename(dir)
      const name = `iris-${label}`
      bonjour = new Bonjour()
      const service = bonjour.publish({
        name,
        type: "http",
        host,
        port,
        txt: {
          path: "/",
          dir: label,
          directory: dir,
        },
      })

      service.on("up", () => {
        log.info("mDNS service published", { name, port, dir: label })
      })

      service.on("error", (err) => {
        log.error("mDNS service error", { error: err })
      })

      currentPort = port
    } catch (err) {
      log.error("mDNS publish failed", { error: err })
      if (bonjour) {
        try {
          bonjour.destroy()
        } catch {}
      }
      bonjour = undefined
      currentPort = undefined
    }
  }

  export function unpublish() {
    if (bonjour) {
      try {
        bonjour.unpublishAll()
        bonjour.destroy()
      } catch (err) {
        log.error("mDNS unpublish failed", { error: err })
      }
      bonjour = undefined
      currentPort = undefined
      log.info("mDNS service unpublished")
    }
  }
}
