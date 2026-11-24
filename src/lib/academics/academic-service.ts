import { createClient } from '@/lib/supabase/server'
import { staticCurriculumCache } from '@/lib/cache/lru-cache'
import { SEED_DEGREES, getDegreeByCode as getSeedDegree, getLessonByPath as getSeedLesson } from './seed-curricula'
import type { AcademicDegree, AcademicLesson, AcademicNotebookEntry } from './types'

export async function getDegrees(): Promise<AcademicDegree[]> {
  return staticCurriculumCache.getOrSet('all_degrees', async () => {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('academic_degrees')
        .select(`
          id,
          code,
          title,
          description,
          duration_years,
          is_active,
          specialisations:academic_specialisations(
            id,
            slug,
            title,
            description,
            is_active
          )
        `)
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (error || !data || data.length === 0) {
        return SEED_DEGREES
      }

      return data.map((d: any) => ({
        id: d.id,
        code: d.code,
        title: d.title,
        description: d.description,
        durationYears: d.duration_years,
        isActive: d.is_active,
        specialisations: (d.specialisations || []).map((s: any) => ({
          id: s.id,
          degreeId: d.id,
          slug: s.slug,
          title: s.title,
          description: s.description,
          isActive: s.is_active,
        })),
      }))
    } catch {
      return SEED_DEGREES
    }
  }, 30 * 60 * 1000)
}

export async function getDegreeDetail(code: string): Promise<AcademicDegree | null> {
  const seed = getSeedDegree(code)
  if (seed) return seed
  const all = await getDegrees()
  return all.find((d) => d.code.toLowerCase() === code.toLowerCase()) || null
}

export async function getLesson(
  degreeCode: string,
  specSlug: string,
  lessonSlug: string
): Promise<AcademicLesson | null> {
  const seed = getSeedLesson(degreeCode, specSlug, lessonSlug)
  if (seed) return seed
  return null
}

export async function getUserNotebook(subjectId?: string): Promise<AcademicNotebookEntry[]> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) return []

    let query = supabase
      .from('academic_notebooks')
      .select('*')
      .eq('user_id', authData.user.id)
      .order('updated_at', { ascending: false })

    if (subjectId) {
      query = query.eq('subject_id', subjectId)
    }

    const { data, error } = await query
    if (error || !data) return []

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      lessonId: row.lesson_id,
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      isPinned: Boolean(row.is_pinned),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch {
    return []
  }
}

export async function saveNotebookEntry(input: {
  id?: string
  subjectId?: string
  lessonId?: string
  title: string
  content: string
  tags?: string[]
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return { success: false, error: 'Authentication required' }

    const payload: any = {
      user_id: userId,
      title: input.title || 'Untitled Note',
      content: input.content,
      subject_id: input.subjectId || null,
      lesson_id: input.lessonId || null,
      tags: input.tags || [],
      updated_at: new Date().toISOString(),
    }

    if (input.id) {
      const { data, error } = await supabase
        .from('academic_notebooks')
        .update(payload)
        .eq('id', input.id)
        .eq('user_id', userId)
        .select('id')
        .single()
      if (error) return { success: false, error: error.message }
      return { success: true, id: data.id }
    } else {
      const { data, error } = await supabase
        .from('academic_notebooks')
        .insert(payload)
        .select('id')
        .single()
      if (error) return { success: false, error: error.message }
      return { success: true, id: data.id }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save note' }
  }
}
