import type { PanelAction } from './tool-handler';
import type { PanelIdentity } from './chat-lifecycle';

/** Release actions only when their actual content identity is ready. */
export class ActionQueue {
  private queue: PanelAction[] = [];
  private ready = false;
  private active = false;
  private identity?: PanelIdentity;
  constructor(private onAction: (action: PanelAction) => void) {}
  setPanelIdentity(identity: PanelIdentity) {
    if (!this.isCurrent(identity)) {
      this.clear();
      this.ready = false;
      this.identity = { ...identity };
    }
  }
  isCurrent(identity: PanelIdentity) {
    return this.identity?.generation === identity.generation
      && this.identity.type === identity.type && this.identity.slug === identity.slug;
  }
  setPanelReady(ready: boolean, identity?: PanelIdentity) {
    if (identity && !this.isCurrent(identity)) return;
    this.ready = ready;
    if (!ready) this.clear();
    else this.flush();
  }
  enqueue(action: PanelAction, identity?: PanelIdentity) {
    if (identity && !this.isCurrent(identity)) return;
    this.queue.push(action);
    this.flush();
  }
  consume(identity?: PanelIdentity) {
    if (identity && !this.isCurrent(identity)) return;
    this.active = false;
    this.flush();
  }
  private flush() {
    if (!this.ready || this.active) return;
    const next = this.queue.shift();
    if (next) { this.active = true; this.onAction(next); }
  }
  clear() { this.queue = []; this.active = false; }
}
