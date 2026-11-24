import type { Article, ArticleCategory } from './types'

export const SEED_CATEGORIES: ArticleCategory[] = [
  { id: 'cat-phil', name: 'Philosophy', slug: 'philosophy', description: 'Classical and contemporary inquiries into mind, ethics, epistemics, and metaphysics.', displayOrder: 1 },
  { id: 'cat-neuro', name: 'Neuroscience', slug: 'neuroscience', description: 'Neural circuits, neuroplasticity, perception, and the biological foundations of cognition.', displayOrder: 2 },
  { id: 'cat-psych', name: 'Psychology', slug: 'psychology', description: 'Human behavior, developmental stages, emotions, and interpersonal dynamics.', displayOrder: 3 },
  { id: 'cat-tech', name: 'Technology', slug: 'technology', description: 'Computing theory, artificial intelligence, software architecture, and societal impact.', displayOrder: 4 },
  { id: 'cat-sci', name: 'Science', slug: 'science', description: 'Physics, evolutionary biology, complex systems, and empirical inquiry.', displayOrder: 5 },
  { id: 'cat-lit', name: 'Literature', slug: 'literature', description: 'Critical essays, textual analysis, narrative structures, and historical canons.', displayOrder: 6 },
  { id: 'cat-hist', name: 'History', slug: 'history', description: 'Civilizational shifts, intellectual histories, and socio-economic turning points.', displayOrder: 7 },
  { id: 'cat-rel', name: 'Relationships', slug: 'relationships', description: 'Intimacy, attachment theory, dialogue, and collaborative dynamics.', displayOrder: 8 },
  { id: 'cat-soc', name: 'Sociology', slug: 'sociology', description: 'Institutional structures, cultural transmission, and group phenomena.', displayOrder: 9 },
  { id: 'cat-dev', name: 'Personal Development', slug: 'personal-development', description: 'Deliberate practice, epistemic humility, and intellectual self-cultivation.', displayOrder: 10 },
]

export const SEED_ARTICLES: Article[] = [
  {
    id: 'art-01',
    slug: 'architecture-of-inwardness',
    title: 'The Architecture of Inwardness: Montaigne on Solitude and Self-Examination',
    subtitle: 'On retiring to the tower of the mind without retreating from the moral world.',
    excerpt: 'Michel de Montaigne famously retreated to his library tower in 1571 to escape political factionalism. Yet his retreat was not an abandonment of humanity, but an architectural experiment in preserving interior autonomy.',
    content: `# The Architecture of Inwardness: Montaigne on Solitude and Self-Examination

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

In an era dominated by hyper-connectivity, continuous notifications, and algorithmic scrutiny, Montaigne’s back shop remains the essential prerequisite for independent intellectual agency. Without an inviolable space for unshared reflections, thought degenerates into collective rhetoric.

---

### The Dialectic of Self-Correction

What did Montaigne actually do in his circular room? He did not formulate abstract theological treatises. Instead, he wrote the *Essays*—inventing a new literary genre derived from the French verb *essayer* ("to try, to weigh, to test").

His method was fundamentally dialectical:
- Record an observation or conventional dogma.
- Subject it to immediate counter-evidence drawn from personal experience.
- Acknowledge contradiction without panic.

"If my mind could gain a firm footing," he wrote, "I would not make essays; I would make decisions. But it is always in apprenticeship and on trial."

This stance—radical intellectual honesty coupled with radical tolerance for uncertainty—is the true fruit of inwardness. Solitude is not an escape from reality; it is the crucible in which genuine perception is rescued from collective noise.`,
    categoryId: 'cat-phil',
    category: SEED_CATEGORIES[0],
    authorId: 'usr-author-1',
    author: {
      id: 'usr-author-1',
      displayName: 'Solace Editorial Board',
      avatarUrl: '/avatars/default.png',
      bio: 'Resident philosophical and historical essayists at Solace.',
    },
    status: 'published',
    readingTimeMinutes: 8,
    isFeatured: true,
    publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    citations: [
      {
        id: 'cit-01',
        articleId: 'art-01',
        citationOrder: 1,
        sourceTitle: 'The Complete Essays of Michel de Montaigne',
        authorName: 'Michel de Montaigne (trans. Donald Frame)',
        publicationYear: 1958,
        doi: '10.2307/j.ctv11317n3',
      },
      {
        id: 'cit-02',
        articleId: 'art-01',
        citationOrder: 2,
        sourceTitle: 'How to Live: A Life of Montaigne in One Question and Twenty Attempts at an Answer',
        authorName: 'Sarah Bakewell',
        publicationYear: 2010,
        url: 'https://otherpress.com/books/how-to-live/',
      },
    ],
    tags: [
      { id: 'tag-01', name: 'Solitude', slug: 'solitude' },
      { id: 'tag-02', name: 'Self-Examination', slug: 'self-examination' },
      { id: 'tag-03', name: 'Montaigne', slug: 'montaigne' },
      { id: 'tag-04', name: 'Stoicism', slug: 'stoicism' },
    ],
  },
  {
    id: 'art-02',
    slug: 'the-synaptic-bridge',
    title: 'The Synaptic Bridge: Plasticity, Memory, and the Molecular Grounds of Experience',
    subtitle: 'How structural reconfigurations of the dendritic arbor transform fleeting sensations into enduring autobiographical identity.',
    excerpt: 'Memory is neither a photographic snapshot nor a static recording tape. It is an active, energetically demanding biological rebuild that takes place across millions of dendritic spines every second.',
    content: `# The Synaptic Bridge: Plasticity, Memory, and the Molecular Grounds of Experience

The human cerebral cortex houses roughly 86 billion neurons, each forming between 1,000 and 10,000 synaptic junctions with its neighbors. Together, these connections form a dynamic network with more than one hundred trillion synaptic nodes—a physical architecture whose connectivity is perpetually restructured by every sensory percept, thought, and cognitive effort.

For over a century, neuroscientists debated how a biological structure composed of short-lived proteins and lipid bilayers could maintain memories that endure across eight decades of human life. The answer lies in **synaptic plasticity**—the brain’s capacity to alter the strength, shape, and molecular composition of its communicative links.

---

### Hebb’s Postulate and Long-Term Potentiation (LTP)

In 1949, Canadian psychologist Donald Hebb formulated what would become the cornerstone of modern neurobiology:

> "When an axon of cell A is near enough to excite a cell B and repeatedly or persistently takes part in firing it, some growth process or metabolic change takes place in one or both cells such that A’s efficiency, as one of the cells firing B, is increased."

Popularized as *"neurons that fire together, wire together,"* this theoretical mechanism remained unproven until 1973, when Terje Lømo and Timothy Bliss discovered **Long-Term Potentiation (LTP)** in the rabbit hippocampus.

When high-frequency electrical pulses stimulate a presynaptic hippocampal axon, glutamate is released into the synaptic cleft:

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

This biological malleability reveals a profound psychological reality: **we do not remember our pasts directly; we remember the last time we recalled them.** Every act of personal reflection is itself an architectural modification of our neural substrate.`,
    categoryId: 'cat-neuro',
    category: SEED_CATEGORIES[1],
    authorId: 'usr-author-1',
    author: {
      id: 'usr-author-1',
      displayName: 'Solace Editorial Board',
      avatarUrl: '/avatars/default.png',
      bio: 'Resident philosophical and historical essayists at Solace.',
    },
    status: 'published',
    readingTimeMinutes: 9,
    isFeatured: true,
    publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    citations: [
      {
        id: 'cit-03',
        articleId: 'art-02',
        citationOrder: 1,
        sourceTitle: 'The Organization of Behavior: A Neuropsychological Theory',
        authorName: 'Donald O. Hebb',
        publicationYear: 1949,
      },
      {
        id: 'cit-04',
        articleId: 'art-02',
        citationOrder: 2,
        sourceTitle: 'Long-lasting potentiation of synaptic transmission in the dentate area of the anaesthetized rabbit following stimulation of the perforant path',
        authorName: 'T. V. P. Bliss and T. Lømo',
        publicationYear: 1973,
        doi: '10.1113/jphysiol.1973.sp010273',
      },
    ],
    tags: [
      { id: 'tag-05', name: 'Neuroplasticity', slug: 'neuroplasticity' },
      { id: 'tag-06', name: 'Memory', slug: 'memory' },
      { id: 'tag-07', name: 'Synapses', slug: 'synapses' },
      { id: 'tag-08', name: 'Cognitive Science', slug: 'cognitive-science' },
    ],
  },
  {
    id: 'art-03',
    slug: 'turing-godel-limits-of-certainty',
    title: 'Turing, Gödel, and the Limits of Computational Certainty',
    subtitle: 'Why the deepest mathematical truths cannot be decided by mechanical algorithms.',
    excerpt: 'In the 1930s, Kurt Gödel and Alan Turing destroyed the dream of total formal certainty in mathematics. In doing so, they revealed the fertile, uncomputable horizon of human thought.',
    content: `# Turing, Gödel, and the Limits of Computational Certainty

In 1900, at the International Congress of Mathematicians in Paris, David Hilbert delivered a historic lecture presenting twenty-three unsolved mathematical problems for the twentieth century. Paramount among his aspirations was the **Entscheidungsproblem** (the Decision Problem): could there exist a definitive, mechanical procedure—an algorithm—capable of deciding the truth or falsehood of any well-formed mathematical assertion?

Hilbert’s confidence was categorical: *"Wir müssen wissen. Wir werden wissen."* ("We must know. We will know.")

Within thirty-six years, this dream of universal mathematical mechanization was decisively dismantled by two young theorists working independently: Kurt Gödel in Vienna and Alan Turing in Cambridge.

---

### Gödel’s Incompleteness: The Self-Referential Fracture

In 1931, twenty-five-year-old Kurt Gödel published his first and second Incompleteness Theorems. Utilizing an ingenious system of mapping mathematical statements onto unique integers (now known as **Gödel numbering**), Gödel constructed a formal proposition $G$ within the axiomatic system of Russell and Whitehead’s *Principia Mathematica* that effectively asserted:

$$G \\iff \\text{"Proposition } G \\text{ is not provable in this formal system."}$$

The dilemma was absolute:
1. If $G$ is provable, then the formal system has proven an assertion that claims it is unprovable. The system is therefore **inconsistent** (it proves false statements).
2. If $G$ is unprovable, then the proposition is **true**—yet beyond the reach of formal proof within the system. The system is therefore **incomplete**.

Gödel proved that any consistent axiomatic system rich enough to perform basic arithmetic is inevitably incomplete. There will always exist mathematical truths that elude the formal machinery of the axioms.

---

### Turing and the Halting Problem

Five years later, in 1936, Alan Turing approached the problem from the perspective of an idealized mechanical apparatus: the **Turing Machine**. A Turing Machine consists of an infinite tape divided into discrete squares, a read/write head, a finite state register, and an action table.

Turing recast Hilbert’s Entscheidungsproblem into an operational question:  
*Can we write a master program $H(M, w)$ that examines any arbitrary program $M$ and input $w$, and halts saying TRUE if $M$ terminates on $w$, or FALSE if $M$ loops forever?*

Turing demonstrated that such a program $H$ is a logical impossibility.

#### The Proof by Contradiction:
Suppose such an algorithm $H$ exists. We can construct an adversarial program $D$ that takes the source code of any program $P$ as input:
1. $D(P)$ calls $H(P, P)$ to check whether $P$ halts when given its own source code as input.
2. If $H$ says $P$ halts, $D$ immediately enters an **infinite loop**.
3. If $H$ says $P$ loops forever, $D$ immediately **halts**.

Now, what happens if we feed $D$ into itself: $D(D)$?
- If $D(D)$ halts, then by definition $D$ enters an infinite loop (contradiction).
- If $D(D)$ loops forever, then by definition $D$ halts (contradiction).

Because both outcomes produce an irresolvable logical paradox, the premise that $H$ can exist is false. **The Halting Problem is undecidable.**

---

### The Philosophical Horizon

The discoveries of Gödel and Turing are frequently portrayed as intellectual defeats—epistemic ceilings beyond which rational inquiry cannot proceed. But this reading misunderstands their significance.

What Gödel and Turing demonstrated is that **truth is intrinsically larger than proof**, and **computation is not synonymous with comprehension**. Formal systems are not sterile cages; they are living, open-ended intellectual territories where human intuition, creativity, and dialectical inquiry remain indispensable.`,
    categoryId: 'cat-tech',
    category: SEED_CATEGORIES[3],
    authorId: 'usr-author-1',
    author: {
      id: 'usr-author-1',
      displayName: 'Solace Editorial Board',
      avatarUrl: '/avatars/default.png',
      bio: 'Resident philosophical and historical essayists at Solace.',
    },
    status: 'published',
    readingTimeMinutes: 10,
    isFeatured: true,
    publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    citations: [
      {
        id: 'cit-05',
        articleId: 'art-03',
        citationOrder: 1,
        sourceTitle: 'Über formal unentscheidbare Sätze der Principia Mathematica und verwandter Systeme I',
        authorName: 'Kurt Gödel',
        publicationYear: 1931,
        doi: '10.1007/BF01700692',
      },
      {
        id: 'cit-06',
        articleId: 'art-03',
        citationOrder: 2,
        sourceTitle: 'On Computable Numbers, with an Application to the Entscheidungsproblem',
        authorName: 'A. M. Turing',
        publicationYear: 1936,
        doi: '10.1112/plms/s2-42.1.230',
      },
    ],
    tags: [
      { id: 'tag-09', name: 'Turing Machines', slug: 'turing-machines' },
      { id: 'tag-10', name: 'Gödel Incompleteness', slug: 'godel-incompleteness' },
      { id: 'tag-11', name: 'Computation Theory', slug: 'computation-theory' },
      { id: 'tag-12', name: 'Mathematical Logic', slug: 'mathematical-logic' },
    ],
  },
]
