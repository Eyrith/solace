import type { AcademicDegree, AcademicLesson } from './types'

export const SEED_DEGREES: AcademicDegree[] = [
  {
    id: 'deg-btech',
    code: 'btech',
    title: 'Bachelor of Technology',
    description: 'Rigorous 4-year engineering curriculum integrating theoretical computing, discrete mathematics, and systems architecture.',
    durationYears: 4,
    isActive: true,
    specialisations: [
      {
        id: 'spec-btech-cse',
        degreeId: 'deg-btech',
        slug: 'cse',
        title: 'Computer Science & Engineering',
        description: 'Core algorithmic analysis, distributed systems, operating system design, and computational theory.',
        isActive: true,
        semesters: [
          {
            id: 'sem-cse-1',
            specialisationId: 'spec-btech-cse',
            semesterNumber: 1,
            title: 'Semester 1: Computational Logic & Mathematical Foundations',
            subjects: [
              {
                id: 'sub-cs101',
                semesterId: 'sem-cse-1',
                code: 'CS101',
                title: 'Programming Fundamentals & Computational Logic',
                description: 'Memory models, stack/heap layout, pointer dereferencing, recursion, and algorithmic complexity.',
                credits: 4,
                orderIndex: 1,
                modules: [
                  {
                    id: 'mod-cs101-1',
                    subjectId: 'sub-cs101',
                    moduleNumber: 1,
                    title: 'Memory Models, Variables, and Execution Stacks',
                    description: 'Stack vs heap mechanics, variable scopes, and pointer addressing.',
                    orderIndex: 1,
                    lessons: [
                      {
                        id: 'les-cs101-1-1',
                        moduleId: 'mod-cs101-1',
                        slug: 'stack-vs-heap-memory',
                        title: 'Stack vs. Heap: The Mechanics of Program Memory',
                        orderIndex: 1,
                        estimatedDurationMinutes: 25,
                        isPublished: true,
                        content: `# Stack vs. Heap: The Mechanics of Program Memory

Every executing software application runs inside an address space allocated by the operating system. Within this virtual memory map, two primary regions govern dynamic program execution: **the call stack** and **the heap**.

Understanding the exact physical and architectural differences between these two memory domains is the difference between writing robust, high-performance software and suffering catastrophic memory leaks and stack overflow crashes.

---

### The Process Memory Map

A standard compiled program in a 64-bit operating system organizes its virtual memory layout as follows:

\`\`\`
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
\`\`\`

---

### The Stack: Automatic, Contiguous, and Fast

The stack is managed directly by the CPU’s hardware stack pointer register (\`RSP\` on x86-64).

#### Key Characteristics
1. **LIFO Semantics:** Last-in, first-out allocation. When a function is called, a new **stack frame** is pushed. When the function returns, the pointer simply increments, instantly deallocating the entire frame.
2. **Deterministic Lifetime:** All primitive local variables inside a function live exactly as long as that function executes.
3. **Cache Coherence:** Because stack memory is contiguous and localized, it almost always resides in the CPU’s L1/L2 cache, making access times virtually instantaneous (~1 nanosecond).
4. **Finite Size:** Stacks have rigid boundaries (typically 1MB to 8MB). Exceeding this boundary through infinite recursion triggers a **Segmentation Fault (SIGSEGV)** or StackOverflowError.

---

### The Heap: Dynamic, Fragmented, and Long-Lived

The heap is an unstructured pool of global memory managed by runtime allocators (such as \`glibc\` \`ptmalloc\`, \`jemalloc\`, or language garbage collectors).

#### Key Characteristics
1. **Arbitrary Lifetime:** Heap allocations persist until explicitly freed by the programmer (\`free()\`, \`delete\`) or collected by an automated garbage collector when all references drop.
2. **Indirection via Pointers:** Accessing heap memory requires dereferencing a pointer that itself sits on the stack. This can introduce cache misses.
3. **Fragmentation Overhead:** Repeated allocations and deallocations of varying sizes can scatter free blocks, leading to external fragmentation and memory bloat.

---

### Code Analysis & Verification

Consider this C implementation:

\`\`\`c
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
    
    printf("Particle ID: %d\\n", my_particle->id);
    
    free(my_particle); // Must manually release heap allocation
    return 0;
}
\`\`\`

*Conceptual Check:* What happens if \`create_particle\` returns \`&local_particle\` where \`Particle local_particle\` was declared without \`malloc\`?  
*Answer:* Returning the address of a stack variable results in a **dangling pointer**—accessing it after the function frame is destroyed leads to undefined behavior and corrupted data.`,
                        quiz: {
                          id: 'quiz-cs101-1',
                          lessonId: 'les-cs101-1-1',
                          title: 'Knowledge Check: Stack vs Heap Memory',
                          description: 'Verify your grasp of virtual address space, cache coherence, and allocation lifecycles.',
                          passingScorePercent: 75,
                          questions: [
                            {
                              id: 'q1',
                              quizId: 'quiz-cs101-1',
                              questionType: 'mcq',
                              questionText: 'Why is stack allocation computationally faster than heap allocation?',
                              options: [
                                { id: 'a', text: 'Stack memory uses superconducting quantum registers.' },
                                { id: 'b', text: 'Stack allocation only requires incrementing/decrementing a CPU register (RSP), while heap allocation involves free-list searches.' },
                                { id: 'c', text: 'Heap memory resides on SSD storage rather than volatile RAM.' },
                                { id: 'd', text: 'Stack memory bypasses operating system security rings.' },
                              ],
                              correctAnswer: 'b',
                              explanation: 'Stack allocation is a simple O(1) pointer adjustment in CPU hardware registers. Heap allocation involves complex runtime algorithms managing free lists, boundary tags, and heap fragmentation.',
                              orderIndex: 1,
                            },
                            {
                              id: 'q2',
                              quizId: 'quiz-cs101-1',
                              questionType: 'true_false',
                              questionText: 'Returning a pointer to a local stack variable from a function is safe as long as the variable is marked const.',
                              options: [
                                { id: 'true', text: 'True' },
                                { id: 'false', text: 'False' },
                              ],
                              correctAnswer: 'false',
                              explanation: 'When a function exits, its entire stack frame is invalidated. Any pointer referencing memory within that frame becomes a dangling pointer regardless of const qualifiers.',
                              orderIndex: 2,
                            },
                          ],
                        },
                      },
                      {
                        id: 'les-cs101-1-2',
                        moduleId: 'mod-cs101-1',
                        slug: 'pointers-and-virtual-memory',
                        title: 'Pointers, Addresses, and Virtual Memory Segmentation',
                        orderIndex: 2,
                        estimatedDurationMinutes: 30,
                        isPublished: true,
                        content: `# Pointers, Addresses, and Virtual Memory Segmentation

In modern computer architecture, software does not interact with physical RAM chips directly. Instead, every program operates inside an illusion orchestrated by the **Memory Management Unit (MMU)** and operating system kernel: **Virtual Memory**.

---

### The Virtual Memory Abstraction

Virtual memory provides three fundamental guarantees:
1. **Isolation:** Program A cannot accidentally overwrite or snoop on the memory of Program B.
2. **Contiguous Illusion:** A process can request a contiguous 1GB buffer, even if physical RAM is scattered across fragmented 4KB page frames.
3. **Overcommit & Paging:** The system can allocate more memory than physically installed by swapping inactive pages to disk storage.

$$\\text{Virtual Address} \\xrightarrow{\\text{MMU Page Tables}} \\text{Physical Address in RAM}$$

---

### Pointer Arithmetic and Indirection

A pointer is simply an integer whose value is interpreted as a virtual memory address:

\`\`\`c
int array[5] = {10, 20, 30, 40, 50};
int* ptr = array; // Points to address of array[0]

// Pointer arithmetic scales by sizeof(int)
printf("*(ptr + 2) = %d\\n", *(ptr + 2)); // Outputs 30
\`\`\`

When you add \`1\` to an \`int*\`, the address increases by \`4\` bytes on a 32/64-bit system, because \`sizeof(int) == 4\`. Pointer arithmetic is always type-scaled.`,
                      },
                    ],
                  },
                ],
              },
              {
                id: 'sub-mth101',
                semesterId: 'sem-cse-1',
                code: 'MTH101',
                title: 'Engineering Mathematics: Linear Algebra & Vector Calculus',
                description: 'Vector spaces, linear transformations, eigenvalue decompositions, and multivariable calculus.',
                credits: 4,
                orderIndex: 2,
                modules: [
                  {
                    id: 'mod-mth101-1',
                    subjectId: 'sub-mth101',
                    moduleNumber: 1,
                    title: 'Vector Spaces, Subspaces, and Linear Maps',
                    description: 'Axiomatic vector spaces, linear independence, basis, and dimension.',
                    orderIndex: 1,
                    lessons: [
                      {
                        id: 'les-mth101-1-1',
                        moduleId: 'mod-mth101-1',
                        slug: 'vector-spaces-and-bases',
                        title: 'Vector Spaces, Linear Independence, and Bases',
                        orderIndex: 1,
                        estimatedDurationMinutes: 35,
                        isPublished: true,
                        content: `# Vector Spaces, Linear Independence, and Bases

Linear algebra is the mathematical language of multi-dimensional spaces. Whether modeling quantum state vectors, training neural network weights, or computing 3D computer graphics transformations, the foundational abstraction remains the **vector space**.

---

### Axiomatic Definition of a Vector Space

A vector space $V$ over a scalar field $F$ (typically $\\mathbb{R}$ or $\\mathbb{C}$) is a set equipped with two operations:
- **Vector Addition:** $u + v \\in V$ for all $u, v \\in V$
- **Scalar Multiplication:** $c \\cdot v \\in V$ for all $c \\in F, v \\in V$

These operations must satisfy eight core axioms:
1. Associativity of addition: $(u + v) + w = u + (v + w)$
2. Commutativity of addition: $u + v = v + u$
3. Identity element of addition: There exists $\\mathbf{0} \\in V$ such that $v + \\mathbf{0} = v$
4. Inverse elements of addition: For every $v$, there exists $-v$ such that $v + (-v) = \\mathbf{0}$
5. Compatibility of scalar multiplication: $a(bv) = (ab)v$
6. Identity element of scalar multiplication: $1 \\cdot v = v$
7. Distributivity of scalar over vector addition: $a(u + v) = au + av$
8. Distributivity of scalar addition over vectors: $(a + b)v = av + bv$

---

### Linear Independence

A set of vectors $\\{v_1, v_2, \\dots, v_k\\}$ is **linearly independent** if the only scalars $c_1, c_2, \\dots, c_k$ that satisfy:

$$c_1 v_1 + c_2 v_2 + \\dots + c_k v_k = \\mathbf{0}$$

are the trivial solution: $c_1 = c_2 = \\dots = c_k = 0$.

If any vector can be written as a linear combination of the others, the set is **linearly dependent** and contains redundant geometric information.`,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'deg-bba',
    code: 'bba',
    title: 'Bachelor of Business Administration',
    description: 'Strategic leadership, managerial economics, organizational sociology, and financial analysis.',
    durationYears: 3,
    isActive: true,
    specialisations: [
      {
        id: 'spec-bba-mgmt',
        degreeId: 'deg-bba',
        slug: 'management',
        title: 'Business Management & Strategy',
        description: 'Strategic decision-making, organizational design, competitive game theory, and market dynamics.',
        isActive: true,
        semesters: [
          {
            id: 'sem-bba-1',
            specialisationId: 'spec-bba-mgmt',
            semesterNumber: 1,
            title: 'Semester 1: Foundations of Management & Economic Theory',
            subjects: [
              {
                id: 'sub-mgt101',
                semesterId: 'sem-bba-1',
                code: 'MGT101',
                title: 'Principles of Modern Management',
                description: 'Classical vs modern organizational theory, strategic decision-making, and corporate governance.',
                credits: 3,
                orderIndex: 1,
                modules: [
                  {
                    id: 'mod-mgt101-1',
                    subjectId: 'sub-mgt101',
                    moduleNumber: 1,
                    title: 'Organizational Architecture & Power Structures',
                    description: 'From Weberian bureaucracy to decentralized agile corporate networks.',
                    orderIndex: 1,
                    lessons: [
                      {
                        id: 'les-mgt101-1-1',
                        moduleId: 'mod-mgt101-1',
                        slug: 'bureaucracy-vs-adaptive-systems',
                        title: 'From Weberian Bureaucracy to Adaptive Networks',
                        orderIndex: 1,
                        estimatedDurationMinutes: 20,
                        isPublished: true,
                        content: `# From Weberian Bureaucracy to Adaptive Networks

In the early twentieth century, sociologist Max Weber identified **rational-legal bureaucracy** as the most efficient organizational technology ever developed by human civilization. Prior to bureaucracy, institutions relied on traditional patrimony (nepotism) or charismatic authority (cults of personality).

---

### The Classical Weberian Pillars

Weber’s model was designed for industrial certainty and predictability:
1. **Strict Hierarchical Authority:** Clear chain of command with explicit reporting lines.
2. **Rules and Standard Operating Procedures (SOPs):** Decisions follow documented precedence rather than personal whim.
3. **Impersonality:** Objective criteria replace personal favors or emotional bias.
4. **Specialization of Labor:** Tasks are subdivided into narrow, repeatable functional roles.

---

### The Modern Critique: The Speed of Change

While bureaucracy excels at mass standardization (railroads, postal services, tax collection), it suffers from severe failure modes in volatile environments:
- **Siloed Communication:** Information must travel up one hierarchy branch and down another, creating lethal decision lag.
- **Goal Displacement:** Employees optimize for adherence to rigid procedure rather than delivering actual value to customers.

Today’s most resilient organizations employ **matrix architectures** and **decentralized autonomous pods**—combining high governance alignment with radical tactical autonomy.`,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

export function getAllDegrees(): AcademicDegree[] {
  return SEED_DEGREES
}

export function getDegreeByCode(code: string): AcademicDegree | undefined {
  return SEED_DEGREES.find((d) => d.code.toLowerCase() === code.toLowerCase())
}

export function getLessonByPath(
  degreeCode: string,
  specSlug: string,
  lessonSlug: string
): AcademicLesson | undefined {
  const degree = getDegreeByCode(degreeCode)
  if (!degree) return undefined

  const spec = degree.specialisations?.find((s) => s.slug === specSlug)
  if (!spec) return undefined

  for (const sem of spec.semesters || []) {
    for (const sub of sem.subjects || []) {
      for (const mod of sub.modules || []) {
        for (const les of mod.lessons || []) {
          if (les.slug === lessonSlug) {
            return {
              ...les,
              module: mod,
              subject: sub,
            }
          }
        }
      }
    }
  }
  return undefined
}
