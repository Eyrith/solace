'use client'

import React, { useState } from 'react'
import { Play, RotateCcw, Terminal, Cpu, Calculator, CheckCircle2 } from 'lucide-react'

interface PracticalWorkspaceProps {
  type?: 'code' | 'finance'
  initialCode?: string
  lessonTitle?: string
}

export function PracticalWorkspace({
  type = 'code',
  initialCode = `// Solace Interactive Memory Simulator
// Experiment: Observing Stack vs Heap memory allocation lifetimes

function simulateAllocation() {
  console.log("--> Function entered: new stack frame pushed [RSP - 32]");
  
  // Stack primitive
  let localValue = 1024;
  console.log(\`Stack variable 'localValue' stored at frame offset: \${localValue}\`);
  
  // Heap allocation simulation
  let heapObject = {
    id: 1,
    label: "Dynamic Node",
    timestamp: Date.now()
  };
  console.log("Heap allocation requested: malloc(24 bytes) returning pointer address 0x7ffd98b0");
  console.log("Heap object data: ", JSON.stringify(heapObject));
  
  console.log("<-- Function exiting: stack frame popped [RSP + 32]");
  console.log("Notice: 'heapObject' pointer destroyed on stack; memory on heap survives until garbage-collected.");
  return heapObject;
}

simulateAllocation();`,
  lessonTitle = 'Memory Execution Simulation',
}: PracticalWorkspaceProps) {
  // Code workspace state
  const [code, setCode] = useState(initialCode)
  const [output, setOutput] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  // Finance workspace state
  const [initialPrice, setInitialPrice] = useState(100)
  const [newPrice, setNewPrice] = useState(110)
  const [initialQuantity, setInitialQuantity] = useState(1000)
  const [newQuantity, setNewQuantity] = useState(850)

  // Run code simulation
  const handleRunCode = () => {
    setIsRunning(true)
    setOutput(['[Compiler] Target: x86-64 Linux ELF simulation...', '[Runtime] Starting process thread (PID 4192)...'])

    setTimeout(() => {
      const logs: string[] = []
      const customConsole = {
        log: (...args: any[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      }

      try {
        // Safe evaluation simulation
        const runFn = new Function('console', code)
        runFn(customConsole)
        setOutput((prev) => [
          ...prev,
          ...logs,
          '----------------------------------------',
          '[Runtime] Execution completed with status code 0 (clean exit).',
        ])
      } catch (err: any) {
        setOutput((prev) => [
          ...prev,
          `[Error] Runtime exception: ${err.message}`,
        ])
      }
      setIsRunning(false)
    }, 400)
  }

  // Finance Elasticity calculation
  const deltaPricePercent = ((newPrice - initialPrice) / initialPrice) * 100
  const deltaQuantityPercent = ((newQuantity - initialQuantity) / initialQuantity) * 100
  const ped = deltaPricePercent !== 0 ? Math.abs(deltaQuantityPercent / deltaPricePercent) : 0
  const initialRevenue = initialPrice * initialQuantity
  const newRevenue = newPrice * newQuantity
  const revenueDelta = newRevenue - initialRevenue

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6 shadow-xs">
      <div className="border-b border-border/40 pb-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-primary uppercase tracking-wider">
            {type === 'code' ? <Cpu className="w-4 h-4 text-sky-500" /> : <Calculator className="w-4 h-4 text-amber-500" />}
            <span>Practical Interactive Workspace</span>
          </div>
          <h3 className="font-serif text-xl font-semibold text-foreground">
            {lessonTitle}
          </h3>
        </div>
      </div>

      {type === 'code' ? (
        /* Code Editor & Execution Terminal */
        <div className="space-y-4">
          <div className="rounded-lg border border-border/40 overflow-hidden bg-muted/20">
            <div className="px-4 py-2 bg-muted/50 border-b border-border/40 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Interactive Code Sandbox (JavaScript / C Logic)</span>
              <button
                type="button"
                onClick={() => setCode(initialCode)}
                className="hover:text-foreground flex items-center gap-1"
                title="Reset code"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <textarea
              rows={12}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-4 bg-transparent font-mono text-xs text-foreground leading-relaxed focus:outline-hidden resize-none"
              spellCheck={false}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={isRunning}
              onClick={handleRunCode}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Running...' : 'Run Simulation'}</span>
            </button>
          </div>

          {output.length > 0 && (
            <div className="rounded-lg border border-border/40 bg-black/90 text-emerald-400 p-4 font-mono text-xs space-y-1 overflow-x-auto shadow-inner">
              <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase border-b border-neutral-800 pb-1 mb-2">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Execution Terminal Output</span>
              </div>
              {output.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Financial & Managerial Case Study Calculator */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border/40 bg-muted/10 space-y-3">
              <h4 className="font-serif text-sm font-semibold">Baseline Market State</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-muted-foreground font-mono text-[10px] uppercase">
                    Initial Unit Price ($)
                  </label>
                  <input
                    type="number"
                    value={initialPrice}
                    onChange={(e) => setInitialPrice(Number(e.target.value))}
                    className="w-full rounded border border-border/40 p-2 bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-mono text-[10px] uppercase">
                    Initial Quantity Demanded (Units)
                  </label>
                  <input
                    type="number"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(Number(e.target.value))}
                    className="w-full rounded border border-border/40 p-2 bg-background font-mono"
                  />
                </div>
                <div className="pt-2 text-muted-foreground font-mono">
                  Initial Revenue: <strong className="text-foreground">${initialRevenue.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border/40 bg-muted/10 space-y-3">
              <h4 className="font-serif text-sm font-semibold">Proposed Price Adjustment</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-muted-foreground font-mono text-[10px] uppercase">
                    New Unit Price ($)
                  </label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full rounded border border-border/40 p-2 bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-mono text-[10px] uppercase">
                    New Quantity Demanded (Units)
                  </label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(Number(e.target.value))}
                    className="w-full rounded border border-border/40 p-2 bg-background font-mono"
                  />
                </div>
                <div className="pt-2 text-muted-foreground font-mono">
                  New Revenue: <strong className="text-foreground">${newRevenue.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
            <h4 className="font-serif text-base font-semibold text-foreground">
              Economic Analysis &amp; Elasticity Verdict
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Price Elasticity (PED)</span>
                <span className="text-xl font-bold text-primary">{ped.toFixed(2)}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {ped > 1 ? 'Elastic Demand (|PED| > 1)' : ped < 1 ? 'Inelastic Demand (|PED| < 1)' : 'Unitary Elastic'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Revenue Impact</span>
                <span className={`text-xl font-bold ${revenueDelta >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {revenueDelta >= 0 ? `+$${revenueDelta.toLocaleString()}` : `-$${Math.abs(revenueDelta).toLocaleString()}`}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {revenueDelta >= 0 ? 'Revenue expansion' : 'Revenue contraction'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Pricing Recommendation</span>
                <span className="text-xs font-serif font-medium text-foreground block pt-1">
                  {ped > 1
                    ? 'Caution: Raising prices on elastic goods contracts total revenue.'
                    : 'Favorable: Firm possesses pricing power; price hike expands total revenue.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
