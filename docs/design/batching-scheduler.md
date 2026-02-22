# Batching & Scheduler — Design Exploration

> Status: **Draft / Ideation**
> Date: 2026-02-22

---

## 1. Problem Statement

Today tldr processes **one input at a time**. The state machine is linear:

```
idle → extracting → summarizing → result → (review/save/discard) → idle
```

This is fine for ad-hoc use, but breaks down when users have multiple things to process:

- **Morning routine**: "I have 6 tabs open from last night — summarize them all."
- **Research session**: "Here are 10 papers. I want to read the summaries back-to-back."
- **Newsletter digest**: "Every Monday, summarize these 5 feeds."
- **Commute prep**: "Queue up my reading list so summaries are ready when I leave."

Two distinct features emerge: **batching** (many inputs, one session) and **scheduling** (deferred/recurring execution). They overlap but have different UX needs.

---

## 2. Batching

### 2.1 Use Cases

| Scenario | Input method | Review style |
|----------|-------------|-------------|
| "Summarize these 5 URLs" | CLI args | Sequential review |
| "I keep finding articles" | Interactive add-to-queue | Review as they finish |
| "Dump my reading list" | File/stdin with URLs | Bulk save, review later |
| "Research deep-dive" | Paste one after another | Side-by-side comparison |

### 2.2 Core Design Principle

**Extraction and summarization should never block each other across items.** If item 3 is a 50-page PDF and item 1 is a tweet, the user shouldn't wait for the PDF to finish before seeing the tweet's summary.

This means a **pipeline architecture**:

```
Input Queue → [Extract] → [Summarize] → Ready Queue → [Review]
                 ↓             ↓
            (parallel)    (parallel, up to concurrency limit)
```

### 2.3 User Journey: CLI Batch Mode

#### Entry point: multiple arguments

```bash
tldr https://article1.com https://article2.com ./paper.pdf "some raw text"
```

**What the user sees:**

```
┌─────────────────────────────────────────────┐
│  Batch: 4 items                             │
│                                             │
│  1. ● article1.com        Summarizing...    │
│  2. ◐ article2.com        Extracting...     │
│  3. ○ paper.pdf            Queued            │
│  4. ○ (raw text)           Queued            │
│                                             │
│  ━━━━━━━━━━━━━░░░░░░░░░░░  1/4 ready        │
│                                             │
│  ESC cancel  •  ↑↓ select  •  Enter review  │
└─────────────────────────────────────────────┘
```

Status symbols:
- `○` Queued
- `◐` Extracting
- `●` Summarizing (spinning)
- `✓` Ready to review
- `✗` Failed

**When first item finishes:**

```
┌─────────────────────────────────────────────┐
│  Batch: 4 items                             │
│                                             │
│  1. ✓ How AI Changes Education   Ready      │
│  2. ● article2.com        Summarizing...    │
│  3. ◐ paper.pdf            Extracting...    │
│  4. ○ (raw text)           Queued            │
│                                             │
│  ━━━━━━━━━━━━━━━━░░░░░░░░  1/4 ready        │
│                                             │
│  Enter review first  •  ESC cancel all      │
└─────────────────────────────────────────────┘
```

The user can **jump into reviewing item 1** while items 2-4 continue processing in the background. This is the key UX insight: **don't make the user wait for the whole batch**.

#### Review flow

When the user presses Enter on a ready item, they see the standard SummaryView — same keybindings (Enter to save, `c` to copy, `q` to discard, `t` to chat). The addition: **navigation between batch items**.

```
┌─ Batch 1/4 ─ How AI Changes Education ──────┐
│                                               │
│  [Full summary content, same as today]        │
│                                               │
│  ← prev   → next   Tab list   Enter save     │
│  Processing: 2/4 remaining...                 │
└───────────────────────────────────────────────┘
```

Key behaviors:
- **`→` or `n`**: Jump to next ready item (skip still-processing ones)
- **`←` or `p`**: Jump to previous item
- **`Tab`**: Return to the batch overview list
- **Enter/q/c/etc.**: Same as today, but after save/discard, auto-advance to next unseen item
- Background items continue processing while user reviews

#### Interactive queue building

In interactive mode, a new slash command:

```
/batch
```

Enters batch mode. The prompt changes to accept multiple inputs:

```
Batch mode — paste URLs or paths (empty line to start)
> https://article1.com
> https://article2.com
> ./paper.pdf
>
Starting batch (3 items)...
```

Or even: inputs added one at a time are queued. The user sees a running list and can trigger processing whenever:

```
> https://article1.com        [queued]
> https://article2.com        [queued]
> /go                          (or just empty Enter)
```

### 2.4 User Journey: File-based Batch

```bash
tldr --batch urls.txt
```

Where `urls.txt` is:

```
https://article1.com
https://article2.com
./local-paper.pdf
```

One URL per line. Blank lines and `#` comments ignored. This is useful for integrating with scripts, bookmarks export, or Pocket/Instapaper dumps.

### 2.5 Concurrency Model

Not all items should run simultaneously — that would overwhelm APIs and local resources.

```
Extraction concurrency:  3  (network I/O, parallelizes well)
Summarization concurrency: 2  (API rate limits, token throughput)
```

These could be configurable but the defaults should be sensible. The pipeline should:

1. Start extracting the first N items immediately
2. As extractions complete, feed them into the summarization pool
3. As summaries complete, mark items as "ready" in the UI
4. Never block the review flow — the user can review while others process

### 2.6 Error Handling

Batch mode must be resilient. One failed extraction shouldn't kill the batch.

```
  3. ✗ broken-link.com       Failed: 404 Not Found     [r]etry  [s]kip
```

- Failed items show inline error + retry option
- User can retry (`r`) or skip (`s`) from the batch list
- Other items continue unaffected
- At end of batch, summary: "3/4 completed, 1 failed"

### 2.7 Bulk Operations

After reviewing, users need batch-level actions:

- **Save all**: `Ctrl+S` or `/save-all` — saves all reviewed summaries
- **Copy all**: Concatenates all summaries into clipboard
- **Export**: `tldr --batch urls.txt --export digest.md` — headless mode, writes all summaries to one markdown file (no interactive review)

The `--export` flag is the "pipeline mode" — useful for automation, cron, scripts.

### 2.8 Pinned Summaries Integration

The existing pinned summaries mechanism (`<Static>` in Ink) already scrolls completed content upward. In batch mode, this becomes the natural "reviewed items scroll up" behavior. The active review stays at the bottom; completed items are pinned above.

---

## 3. Scheduling

### 3.1 Why Scheduling is Harder in CLI

Desktop apps run persistently — they can wake up, fetch, and notify. CLI tools are ephemeral by nature. A "scheduled summary" in CLI needs one of:

1. **System-level scheduler** (cron/launchd/systemd) invoking `tldr` at set times
2. **Daemon mode** where `tldr` stays running in the background
3. **"Prep" mode** where the user says "prepare these for later" and reviews when ready

Option 1 is the most Unix-y. Option 2 fights the CLI grain. Option 3 is really just batching with deferred review.

### 3.2 Recommended Approach: Schedule = Cron + Headless Batch

Rather than building a scheduler into tldr itself, provide the building blocks:

```bash
# Headless batch: extract + summarize, save results, no interactive review
tldr --batch urls.txt --export ~/Documents/tldr/morning-digest.md

# Or individual headless runs
tldr --save https://article.com  # extract, summarize, save, exit
```

Then the user wires this into their own scheduler:

```cron
# Every weekday at 7am, summarize my reading list
0 7 * * 1-5 tldr --batch ~/.tldr/reading-list.txt --export ~/Documents/tldr/morning-brief.md
```

**tldr's responsibility**: headless mode that works reliably without TTY. The user's responsibility: when and how often to run it.

### 3.3 The "Inbox" Pattern

Scheduled runs produce saved summaries, but the user needs a way to review them later. This becomes an enhanced history/inbox:

```bash
tldr                     # launch interactive mode
/inbox                   # show unreviewed summaries from headless runs
```

```
┌─ Inbox (3 new) ─────────────────────────────┐
│                                               │
│  ★ How AI Changes Education    today 7:00am   │
│  ★ Rust 2026 Roadmap           today 7:00am   │
│  ★ New ADHD Research           today 7:00am   │
│    (from: morning-brief batch)                │
│                                               │
│  ↑↓ navigate  •  Enter read  •  ESC close     │
└───────────────────────────────────────────────┘
```

The star (`★`) indicates unread. Once the user opens a summary, it's marked as read. This bridges the gap between headless scheduled runs and interactive review.

### 3.4 Reading List / Watch List

A lighter alternative to full scheduling: a persistent reading list.

```bash
tldr --queue https://article.com        # add to reading list (don't process yet)
tldr --queue ./paper.pdf                 # add local file
tldr --queue --list                      # show current queue
tldr --queue --go                        # process entire queue now
```

Or interactively:

```
> /queue https://article.com       → Added to reading list (4 items)
> /queue https://another.com       → Added to reading list (5 items)
> /queue                           → Shows queue, option to process
```

This gives users a "save for later, batch when ready" workflow without any daemon or cron. It's the most natural CLI pattern: accumulate, then execute.

### 3.5 Desktop vs CLI: Division of Labor

| Capability | CLI | Desktop |
|-----------|-----|---------|
| Batch processing | `--batch` flag + interactive `/batch` | Drag-drop multiple, queue UI |
| Headless export | `--export` flag | N/A (always has UI) |
| Scheduling | Cron/launchd + headless mode | Built-in scheduler with notifications |
| Reading list | `--queue` + `/queue` | Bookmark-style UI with sync |
| Inbox/unread | `/inbox` slash command | Badge count + notification |
| Background processing | Terminal stays open | True background with menubar icon |

The CLI should **not** try to be a daemon. It should provide excellent building blocks that compose with Unix tools. The desktop app handles persistence, notifications, and background execution.

---

## 4. Architecture

### 4.1 New Types

```typescript
// Batch item tracking
interface BatchItem {
  id: string;
  input: string;                          // raw URL/path/text
  status: 'queued' | 'extracting' | 'summarizing' | 'ready' | 'failed' | 'reviewed';
  extraction?: ExtractionResult;
  summary?: string;
  result?: TldrResult;
  error?: { message: string; hint?: string };
}

// Batch state
interface BatchState {
  items: BatchItem[];
  concurrency: { extraction: number; summarization: number };
  activeView: 'list' | 'review';
  reviewIndex: number;                    // which item is being reviewed
}

// Reading list persistence (~/.tldr/queue.json)
interface ReadingQueue {
  items: Array<{ input: string; addedAt: number; label?: string }>;
}
```

### 4.2 New App States

The current `AppState` union would extend:

```typescript
type AppState =
  | 'idle'
  | 'extracting' | 'summarizing' | 'result'  // existing single-item flow
  | 'batch-progress'                           // batch overview list
  | 'batch-review'                             // reviewing one item in batch
  | 'inbox'                                    // viewing unread headless results
  | 'error' | 'config' | 'chat' | 'help' | 'history' | 'profile';
```

### 4.3 Pipeline Engine (Core)

A new module `src/lib/batch.ts` (or `src/lib/pipeline.ts` if renamed):

```typescript
interface BatchEngine {
  add(input: string): string;                    // returns item ID
  start(): void;                                  // begins processing
  cancel(itemId?: string): void;                  // cancel one or all
  retry(itemId: string): void;                    // retry failed item
  on(event: 'item-update', cb: (item: BatchItem) => void): void;
  on(event: 'all-done', cb: (items: BatchItem[]) => void): void;
  getItems(): BatchItem[];
}
```

This engine lives in `core` so the desktop app can reuse it. The CLI's Ink components subscribe to events and re-render.

### 4.4 Component Structure

```
<App>
  ├── <BatchProgressView>          # overview list with status indicators
  │     └── <BatchItemRow>         # per-item status line
  ├── <BatchReviewView>            # wraps SummaryView with ←→ navigation
  │     └── <SummaryView>          # existing component, unchanged
  └── <InboxView>                  # unread summaries from headless runs
```

### 4.5 Headless Mode

For `--export` and cron usage:

```typescript
// In src/index.tsx, before Ink rendering:
if (flags.batch && flags.export) {
  // No Ink, no TTY required
  const engine = createBatchEngine(config);
  for (const input of inputs) engine.add(input);
  engine.start();
  engine.on('all-done', (items) => {
    const markdown = items
      .filter(i => i.status === 'ready')
      .map(i => formatExportEntry(i))
      .join('\n---\n');
    writeFileSync(flags.export, markdown);
    process.exit(0);
  });
}
```

---

## 5. Open Questions

### 5.1 UX Decisions

1. **Auto-advance after save?** When reviewing batch items, should saving automatically jump to the next item? Or stay on current with a "Saved ✓" indicator?
   - *Leaning*: Auto-advance with a brief toast, since the user's intent in batch mode is throughput.

2. **Streaming in batch mode?** Today, summary text streams token-by-token. In batch mode, should the overview list show partial summaries, or just flip from "summarizing" to "ready"?
   - *Leaning*: Overview shows status only. Streaming visible only when user enters review for a specific item that's still summarizing.

3. **Chat in batch mode?** Should `t` (chat) still work per-item?
   - *Leaning*: Yes, unchanged. Chat is per-summary context.

4. **Audio in batch mode?** Generating TTS for every item in a batch seems excessive.
   - *Leaning*: Available per-item in review, but no "generate audio for all" shortcut.

5. **Batch size limits?** Should there be a maximum?
   - *Leaning*: Soft warning at 20+ items ("This may take a while"), hard limit at 100 to prevent accidental misuse.

### 5.2 Technical Decisions

1. **Concurrency library?** Options: hand-rolled with Promise pool, `p-limit`, or `p-queue`.
   - *Leaning*: `p-limit` — minimal dependency, well-tested, sufficient for this use case.

2. **Queue persistence?** Should in-progress batches survive a crash/restart?
   - *Leaning*: Not for v1. If the process dies, the batch is lost. Headless `--export` mode can be re-run idempotently. Future: write batch state to `~/.tldr/batch-state.json`.

3. **Inbox storage?** Where do headless results go?
   - *Leaning*: Same history.json, but with an `unread: true` flag. `/inbox` filters for unread. Simple, no new storage.

---

## 6. Implementation Phases

### Phase 1: CLI Batch Arguments
- `tldr url1 url2 url3` processes multiple inputs
- Sequential processing (no concurrency yet)
- Batch overview list with status
- Navigation between ready results

### Phase 2: Concurrent Pipeline
- Parallel extraction + summarization with concurrency limits
- Items become reviewable as they finish (not in order)
- Error isolation per item

### Phase 3: Interactive Batch + Queue
- `/batch` slash command for interactive queue building
- `/queue` for persistent reading list
- `--batch file.txt` for file-based input

### Phase 4: Headless + Inbox
- `--export` flag for non-interactive output
- `--save` flag for single-item headless save
- `/inbox` for reviewing headless results
- `unread` tracking in history

### Phase 5: Desktop Sync
- `BatchEngine` exposed via `core` exports
- Desktop app integrates with native scheduler
- Shared queue format between CLI and desktop

---

## 7. Summary of Recommendations

1. **Batch first, schedule later.** Batching is the higher-value, lower-complexity feature. Scheduling in CLI should be "provide good headless mode + let cron handle timing."

2. **Don't block the user.** The pipeline should let users review finished items while others process. This is the single most important UX decision.

3. **Keep the single-item flow untouched.** `tldr <one-url>` should work exactly as it does today. Batch mode activates only with multiple inputs or explicit flags.

4. **Unix philosophy for scheduling.** Don't build a daemon. Build composable primitives (`--export`, `--save`, `--batch`) that work with cron, launchd, and scripts.

5. **Inbox bridges async and interactive.** Headless runs write to history with an unread flag. The user reviews them later via `/inbox`. Simple, no new infrastructure.
