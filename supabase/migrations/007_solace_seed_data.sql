-- =============================================================================
-- Migration: 007_solace_seed_data
-- Seed first-party article categories, original long-form articles,
-- academic degrees, specialisations, subjects, modules, and lessons.
-- =============================================================================

begin;

-- ─── 1. Article Categories ───────────────────────────────────────────────────

insert into public.article_categories (name, slug, description, display_order)
values
  ('Philosophy', 'philosophy', 'Classical and contemporary inquiries into mind, ethics, epistemics, and metaphysics.', 1),
  ('Neuroscience', 'neuroscience', 'Neural circuits, neuroplasticity, perception, and the biological foundations of cognition.', 2),
  ('Psychology', 'psychology', 'Human behavior, developmental stages, emotions, and interpersonal dynamics.', 3),
  ('Technology', 'technology', 'Computing theory, artificial intelligence, software architecture, and societal impact.', 4),
  ('Science', 'science', 'Physics, evolutionary biology, complex systems, and empirical inquiry.', 5),
  ('Literature', 'literature', 'Critical essays, textual analysis, narrative structures, and historical canons.', 6),
  ('History', 'history', 'Civilizational shifts, intellectual histories, and socio-economic turning points.', 7),
  ('Relationships', 'relationships', 'Intimacy, attachment theory, dialogue, and collaborative dynamics.', 8),
  ('Sociology', 'sociology', 'Institutional structures, cultural transmission, and group phenomena.', 9),
  ('Personal Development', 'personal-development', 'Deliberate practice, epistemic humility, and intellectual self-cultivation.', 10)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order;

-- ─── 2. Original First-Party Articles ────────────────────────────────────────

-- Article 1: Montaigne & Solitude
insert into public.articles (
  slug,
  title,
  subtitle,
  excerpt,
  content,
  category_id,
  status,
  reading_time_minutes,
  is_featured,
  published_at
)
select
  'architecture-of-inwardness',
  'The Architecture of Inwardness: Montaigne on Solitude and Self-Examination',
  'On retiring to the tower of the mind without retreating from the moral world.',
  'Michel de Montaigne famously retreated to his library tower in 1571 to escape political factionalism. Yet his retreat was not an abandonment of humanity, but an architectural experiment in preserving interior autonomy.',
  '# The Architecture of Inwardness: Montaigne on Solitude and Self-Examination

> "We must have a back shop, all our own, entirely free, wherein to establish our true liberty and our principal retreat and solitude."  
> — Michel de Montaigne, *Essays* (Book I, Chapter 39)

In the spring of 1571, on his thirty-eighth birthday, Michel de Montaigne formally withdrew from public life in the parliament of Bordeaux. Weary of courtly servitude and the ferocious sectarian bloodshed of the French Wars of Religion, he sequestered himself in the circular library on the third floor of his family chateau. Carved into the wooden rafters overhead were fifty-four maxims in Greek and Latin—admonitions against epistemic arrogance from Sextus Empiricus, Lucretius, and the book of Ecclesiastes.

Yet Montaigne’s withdrawal has often been misunderstood as an act of aristocratic misanthropy or escapist self-indulgence. In reality, it constituted an ambitious methodological experiment: **the construction of an intellectual refuge capable of interrogating the self without deceit.**

---

### The Myth of Absolute Detachment

To seek solitude, Montaigne observed, is not merely to change geographical coordinates. The courtier who flees the royal palace into the country often brings along his ambient anxieties, ambitions, and resentments. True solitude is not a physical perimeter; it is an epistemic stance:

> "It is not enough to get away from the crowd; it is not enough to move elsewhere. We must rid ourselves of the courtier’s humor that is within us; we must sequester and regain possession of ourselves."

When the mind is unmoored from external duties and public performativity, it does not immediately settle into tranquil contemplation. Instead, as Montaigne confessed in *On Idleness*, an unguided mind behaves like an unbridled horse—rearing up and generating wild chimera, anxieties, and unformed obsessions. Self-examination requires intentional discipline. It requires an intellectual framework.

---

### The "Back Shop" of Consciousness

Montaigne’s central conceptual contribution to the philosophy of solitude is his metaphor of the *arrière-boutique*—the "back shop" behind the storefront of public life:

1. **The Storefront:** The civic realm where we fulfill our professional duties, sustain societal contracts, and honor our familial obligations. Montaigne never preached dereliction of duty; he served twice as mayor of Bordeaux during periods of plague and insurrection.
2. **The Back Room:** An inviolable sanctuary of pure reflection, inaccessible to husbands, wives, princes, and creditors. In this inner room, we cultivate thoughts that are strictly our own.

```
┌────────────────────────────────────────────────────────┐
│                   THE PUBLIC STOREFRONT                │
│    Civic Duty  •  Professional Labor  •  Reputation    │
└───────────────────────────┬────────────────────────────┘
                            │
              [ The Inward Boundary / Lintel ]
                            │
┌───────────────────────────▼────────────────────────────┐
│                    THE BACK SHOP                       │
│    Self-Interrogation • Philosophical Doubt • Solitude │
└────────────────────────────────────────────────────────┘
```

In an era dominated by hyper-connectivity, continuous notifications, and algorithmic scrutiny, Montaigne’s back shop remains the essential prerequisite for independent intellectual agency. Without an inviolable space for unshared reflections, thought degenerates into collective rhetoric.

---

### The Dialectic of Self-Correction

What did Montaigne actually do in his circular room? He did not formulate abstract theological treatises. Instead, he wrote the *Essays*—inventing a new literary genre derived from the French verb *essayer* ("to try, to weigh, to test").

His method was fundamentally dialectical:
- Record an observation or conventional dogma.
- Subject it to immediate counter-evidence drawn from personal experience.
- Acknowledge contradiction without panic.

"If my mind could gain a firm footing," he wrote, "I would not make essays; I would make decisions. But it is always in apprenticeship and on trial."

This stance—radical intellectual honesty coupled with radical tolerance for uncertainty—is the true fruit of inwardness. Solitude is not an escape from reality; it is the crucible in which genuine perception is rescued from collective noise.',
  c.id,
  'published',
  8,
  true,
  now() - interval '2 days'
from public.article_categories c
where c.slug = 'philosophy'
on conflict (slug) do nothing;

-- Article 2: Neuroscience & Plasticity
insert into public.articles (
  slug,
  title,
  subtitle,
  excerpt,
  content,
  category_id,
  status,
  reading_time_minutes,
  is_featured,
  published_at
)
select
  'the-synaptic-bridge',
  'The Synaptic Bridge: Plasticity, Memory, and the Molecular Grounds of Experience',
  'How structural reconfigurations of the dendritic arbor transform fleeting sensations into enduring autobiographical identity.',
  'Memory is neither a photographic snapshot nor a static recording tape. It is an active, energetically demanding biological rebuild that takes place across millions of dendritic spines every second.',
  '# The Synaptic Bridge: Plasticity, Memory, and the Molecular Grounds of Experience

The human cerebral cortex houses roughly 86 billion neurons, each forming between 1,000 and 10,000 synaptic junctions with its neighbors. Together, these connections form a dynamic network with more than one hundred trillion synaptic nodes—a physical architecture whose connectivity is perpetually restructured by every sensory percept, thought, and cognitive effort.

For over a century, neuroscientists debated how a biological structure composed of short-lived proteins and lipid bilayers could maintain memories that endure across eight decades of human life. The answer lies in **synaptic plasticity**—the brain’s capacity to alter the strength, shape, and molecular composition of its communicative links.

---

### Hebb’s Postulate and Long-Term Potentiation (LTP)

In 1949, Canadian psychologist Donald Hebb formulated what would become the cornerstone of modern neurobiology:

> "When an axon of cell A is near enough to excite a cell B and repeatedly or persistently takes part in firing it, some growth process or metabolic change takes place in one or both cells such that A’s efficiency, as one of the cells firing B, is increased."

Popularized as *"neurons that fire together, wire together,"* this theoretical mechanism remained unproven until 1973, when Terje Lømo and Timothy Bliss discovered **Long-Term Potentiation (LTP)** in the rabbit hippocampus.

```
       Presynaptic Terminal (Axon)
          │  [ Glutamate release ]
          ▼
    ┌──────────┐       ┌──────────┐
    │  AMPA-R  │       │  NMDA-R  │ (Mg2+ block removed by depolarization)
    └────┬─────┘       └────┬─────┘
         │ Na+ influx       │ Ca2+ influx  ───► CaMKII Activation
         ▼                  ▼
    Depolarization ──► Retrograde Signals & Protein Synthesis
                            │
                            ▼
               [ Dendritic Spine Enlargement ]
```

When high-frequency electrical pulses stimulate a presynaptic hippocampal axon, glutamate is released into the synaptic cleft. 

1. Glutamate binds to **AMPA receptors**, permitting an influx of sodium ions ($Na^+$) that mildly depolarizes the postsynaptic membrane.
2. Under normal baseline activity, neighboring **NMDA receptors** remain blocked by a positively charged magnesium ion ($Mg^{2+}$).
3. When depolarization is sufficiently sustained, the electrostatic repulsion ejects the $Mg^{2+}$ ion from the NMDA channel pore.
4. Calcium ions ($Ca^{2+}$) surge through the open NMDA channel into the dendritic spine, triggering calcium/calmodulin-dependent protein kinase II (**CaMKII**).

---

### Structural Remodeling: The Physical Reality of Thought

The influx of calcium does not merely alter electrical conductivity; it initiates transcription cascades that structurally rebuild the neuron:

- **Actin Cytoskeleton Polymerization:** The dendritic spine physically expands in volume, transforming from a slender neck into a wide "mushroom" spine with a broader postsynaptic density.
- **AMPA Receptor Insertion:** Additional AMPA receptors are shuttled from intracellular vesicles and anchored into the postsynaptic membrane, rendering the synapse permanently more sensitive to future glutamate release.
- **Gene Transcription via CREB:** Calcium signals travel to the cell nucleus, phosphorylating the transcription factor CREB (cAMP response element-binding protein). This triggers the synthesis of new structural proteins and neurotrophins like BDNF (Brain-Derived Neurotrophic Factor).

---

### The Fragility of Consolidation: Reconsolidation and Malleability

Crucially, memory traces (*engrams*) are not permanent steel engravings. Research by Karim Nader and Joseph LeDoux demonstrated that whenever a stored memory is recalled into conscious awareness, it temporarily reverts to an unstable, labile state.

During this brief window, known as **reconsolidation**, the engram requires new protein synthesis to be re-stored. If protein synthesis is inhibited or if counter-emotional conditioning is introduced during this interval, the original memory trace can be fundamentally reshaped or erased.

This biological malleability reveals a profound psychological reality: **we do not remember our pasts directly; we remember the last time we recalled them.** Every act of personal reflection is itself an architectural modification of our neural substrate.',
  c.id,
  'published',
  9,
  true,
  now() - interval '1 day'
from public.article_categories c
where c.slug = 'neuroscience'
on conflict (slug) do nothing;

-- ─── 3. Academic Pilot: Degrees, Subjects, Modules & Lessons ──────────────────

-- Degree 1: B.Tech
insert into public.academic_degrees (code, title, description, duration_years, is_active)
values
  ('btech', 'Bachelor of Technology', 'Comprehensive engineering curriculum balancing theoretical computing, discrete mathematics, and systems design.', 4, true),
  ('bba', 'Bachelor of Business Administration', 'Foundational management education covering strategic leadership, economics, accounting, and quantitative decision science.', 3, true)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description;

-- Specialisation for B.Tech: CSE
insert into public.academic_specialisations (degree_id, slug, title, description, is_active)
select
  d.id,
  'cse',
  'Computer Science & Engineering',
  'Core algorithms, data structures, systems architecture, and mathematical computational theory.',
  true
from public.academic_degrees d
where d.code = 'btech'
on conflict (degree_id, slug) do nothing;

-- Semester 1 for CSE
insert into public.academic_semesters (specialisation_id, semester_number, title)
select
  s.id,
  1,
  'Semester 1: Foundations of Computing & Mathematics'
from public.academic_specialisations s
where s.slug = 'cse'
on conflict (specialisation_id, semester_number) do nothing;

-- Subjects for Semester 1 CSE
insert into public.academic_subjects (semester_id, code, title, description, credits, order_index)
select
  sem.id,
  'CS101',
  'Programming Fundamentals & Computational Logic',
  'Principles of procedural and functional programming, pointer mechanics, memory layout, recursion, and algorithmic complexity.',
  4,
  1
from public.academic_semesters sem
join public.academic_specialisations sp on sem.specialisation_id = sp.id
where sp.slug = 'cse' and sem.semester_number = 1
on conflict do nothing;

insert into public.academic_subjects (semester_id, code, title, description, credits, order_index)
select
  sem.id,
  'MTH101',
  'Engineering Mathematics: Linear Algebra & Calculus',
  'Vector spaces, eigenvalue decompositions, multidimensional calculus, and series expansions.',
  4,
  2
from public.academic_semesters sem
join public.academic_specialisations sp on sem.specialisation_id = sp.id
where sp.slug = 'cse' and sem.semester_number = 1
on conflict do nothing;

-- Modules for CS101
insert into public.academic_modules (subject_id, module_number, title, description, order_index)
select
  sub.id,
  1,
  'Memory Models, Variables, and Execution Stacks',
  'Understanding stack vs. heap allocation, variable scopes, and pointer addressing.',
  1
from public.academic_subjects sub
where sub.code = 'CS101'
on conflict do nothing;

insert into public.academic_modules (subject_id, module_number, title, description, order_index)
select
  sub.id,
  2,
  'Recursion, Call Stacks, and Algorithmic Induction',
  'Mathematical induction applied to code, recursive problem decomposition, and memoization.',
  2
from public.academic_subjects sub
where sub.code = 'CS101'
on conflict do nothing;

-- Lessons for Module 1 CS101
insert into public.academic_lessons (
  module_id,
  slug,
  title,
  content,
  order_index,
  estimated_duration_minutes,
  is_published
)
select
  m.id,
  'stack-vs-heap-memory',
  'Stack vs. Heap: The Mechanics of Program Memory',
  '# Stack vs. Heap: The Mechanics of Program Memory

Every executing software application runs inside an address space allocated by the operating system. Within this virtual memory map, two primary regions govern dynamic program execution: **the call stack** and **the heap**.

Understanding the exact physical and architectural differences between these two memory domains is the difference between writing robust, high-performance software and suffering catastrophic memory leaks and stack overflow crashes.

---

### The Process Memory Map

A standard compiled program in a 64-bit operating system organizes its virtual memory layout as follows:

```
High Memory Address (0x7FFFFFFFFFFF)
┌──────────────────────────────────────────────┐
│  Environment Variables & CLI Arguments       │
├──────────────────────────────────────────────┤
│  Stack (Grows downwards ▼)                   │
│  - Local variables, Return pointers, Frames  │
│                                              │
│                   ▲                          │
│                   │ (Free Unallocated Space) │
│                   ▼                          │
│                                              │
│  Heap (Grows upwards ▲)                      │
│  - Dynamically allocated objects (malloc/new)│
├──────────────────────────────────────────────┤
│  BSS & Initialized Data Segments             │
│  - Static & global variables                 │
├──────────────────────────────────────────────┤
│  Text / Code Segment (Read-only)             │
│  - Binary machine instructions               │
└──────────────────────────────────────────────┘
Low Memory Address (0x000000000000)
```

---

### The Stack: Automatic, Contiguous, and Fast

The stack is managed directly by the CPU’s hardware stack pointer register (`RSP` on x86-64).

#### Key Characteristics
1. **LIFO Semantics:** Last-in, first-out allocation. When a function is called, a new **stack frame** is pushed. When the function returns, the pointer simply increments, instantly deallocating the entire frame.
2. **Deterministic Lifetime:** All primitive local variables inside a function live exactly as long as that function executes.
3. **Cache Coherence:** Because stack memory is contiguous and localized, it almost always resides in the CPU’s L1/L2 cache, making access times virtually instantaneous (~1 nanosecond).
4. **Finite Size:** Stacks have rigid boundaries (typically 1MB to 8MB). Exceeding this boundary through infinite recursion triggers a **Segmentation Fault (SIGSEGV)** or StackOverflowError.

---

### The Heap: Dynamic, Fragmented, and Long-Lived

The heap is an unstructured pool of global memory managed by runtime allocators (such as `glibc` `ptmalloc`, `jemalloc`, or language garbage collectors).

#### Key Characteristics
1. **Arbitrary Lifetime:** Heap allocations persist until explicitly freed by the programmer (`free()`, `delete`) or collected by an automated garbage collector when all references drop.
2. **Indirection via Pointers:** Accessing heap memory requires dereferencing a pointer that itself sits on the stack. This can introduce cache misses.
3. **Fragmentation Overhead:** Repeated allocations and deallocations of varying sizes can scatter free blocks, leading to external fragmentation and memory bloat.

---

### Interactive Check: Code Analysis

Consider the following C code snippet:

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int id;
    double coordinates[3];
} Particle;

Particle* create_particle(int id, double x, double y, double z) {
    // Allocation on the HEAP
    Particle* p = (Particle*)malloc(sizeof(Particle));
    if (p == NULL) return NULL;
    
    p->id = id;
    p->coordinates[0] = x;
    p->coordinates[1] = y;
    p->coordinates[2] = z;
    
    return p; // Safe: p points to heap memory that survives function return
}

int main() {
    int local_counter = 42; // Allocated on the STACK
    Particle* my_particle = create_particle(1, 0.5, 1.2, 9.8);
    
    printf("Particle ID: %d\n", my_particle->id);
    
    free(my_particle); // Must manually release heap allocation
    return 0;
}
```

*Question for reflection:* What happens if `create_particle` returns `&local_particle` where `Particle local_particle` was declared without `malloc`?  
*Answer:* Returning the address of a stack variable results in a **dangling pointer**—accessing it after the function frame is destroyed leads to undefined behavior.',
  1,
  25,
  true
from public.academic_modules m
join public.academic_subjects s on m.subject_id = s.id
where s.code = 'CS101' and m.module_number = 1
on conflict (module_id, slug) do nothing;

-- Quiz for CS101 Lesson 1
insert into public.academic_quizzes (lesson_id, title, description, passing_score_percent)
select
  l.id,
  'Knowledge Check: Stack vs Heap Memory Architecture',
  'Verify your understanding of memory layouts, allocation lifetimes, and cache implications.',
  75
from public.academic_lessons l
where l.slug = 'stack-vs-heap-memory'
on conflict do nothing;

insert into public.quiz_questions (quiz_id, question_type, question_text, options, correct_answer, explanation, order_index)
select
  q.id,
  'mcq',
  'Why is stack allocation significantly faster than heap allocation?',
  '[
    {"id": "a", "text": "The stack uses quantum registers while the heap uses standard transistors."},
    {"id": "b", "text": "Stack allocation only involves adjusting the CPU stack pointer, whereas heap allocation requires searching memory freelists."},
    {"id": "c", "text": "Heap memory is stored on the hard drive while stack memory is stored in RAM."},
    {"id": "d", "text": "Stack memory does not enforce type boundaries."}
  ]'::jsonb,
  'b',
  'Allocating on the stack is an O(1) operation achieved by decrementing the stack pointer register (RSP). Heap allocation requires invoking the memory allocator to find an appropriate free block, maintain metadata, and prevent fragmentation.',
  1
from public.academic_quizzes q
join public.academic_lessons l on q.lesson_id = l.id
where l.slug = 'stack-vs-heap-memory'
on conflict do nothing;

insert into public.quiz_questions (quiz_id, question_type, question_text, options, correct_answer, explanation, order_index)
select
  q.id,
  'true_false',
  'Returning a pointer to a local stack variable from a function is safe as long as the variable was declared as a struct rather than a primitive.',
  '[
    {"id": "true", "text": "True"},
    {"id": "false", "text": "False"}
  ]'::jsonb,
  'false',
  'Any variable allocated directly on the stack has its memory reclaimed when the function returns. The memory address becomes invalid regardless of whether it was a primitive, array, or struct.',
  2
from public.academic_quizzes q
join public.academic_lessons l on q.lesson_id = l.id
where l.slug = 'stack-vs-heap-memory'
on conflict do nothing;

commit;
