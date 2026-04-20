import { supabase } from './supabase'

function normalizeTags(tags) {
  const normalized = Array.isArray(tags) ? tags : [tags]
  const cleaned = normalized
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)

  return cleaned.length ? cleaned : ['General']
}

function parseStoredTags(value) {
  if (!value) {
    return ['General']
  }

  if (Array.isArray(value)) {
    return normalizeTags(value)
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return ['General']
    }

    if (trimmedValue.startsWith('[')) {
      try {
        return normalizeTags(JSON.parse(trimmedValue))
      } catch {
        return normalizeTags(trimmedValue)
      }
    }

    return normalizeTags(trimmedValue.split(','))
  }

  return ['General']
}

function serializeTags(tags) {
  return JSON.stringify(normalizeTags(tags))
}

function mapPriorityFromDb(priority) {
  if (priority === 'high') {
    return 'High'
  }

  if (priority === 'low') {
    return 'Low'
  }

  if (priority === 'done') {
    return 'Done'
  }

  return 'Medium'
}

function mapPriorityToDb(priority) {
  if (priority === 'High') {
    return 'high'
  }

  if (priority === 'Low') {
    return 'low'
  }

  if (priority === 'Done') {
    return 'done'
  }

  return 'normal'
}

function mapCommentRow(row) {
  return {
    id: row.id,
    author: row.author,
    message: row.message,
    createdAt: row.created_at,
  }
}

function mapActivityRow(row) {
  return {
    id: row.id,
    actor: row.actor,
    actionType: row.action_type,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }
}

function sortCommentsChronologically(comments) {
  return [...comments].sort((leftComment, rightComment) => {
    const leftTime = new Date(leftComment.createdAt).getTime()
    const rightTime = new Date(rightComment.createdAt).getTime()
    return leftTime - rightTime
  })
}

function sortActivityChronologically(history) {
  return [...history].sort((leftEntry, rightEntry) => {
    const leftTime = new Date(leftEntry.createdAt).getTime()
    const rightTime = new Date(rightEntry.createdAt).getTime()
    return rightTime - leftTime
  })
}

export function mapRowToTask(row, comments = [], history = []) {
  const tags = parseStoredTags(row.tag)

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    assignee: row.assignee_name || 'Unassigned',
    priority: mapPriorityFromDb(row.priority),
    dueDate: row.due_date || '',
    tags,
    tag: tags[0] || 'General',
    completed: row.completed ?? false,
    comments: sortCommentsChronologically(comments.map(mapCommentRow)),
    history: sortActivityChronologically(history.map(mapActivityRow)),
    createdAt: row.created_at,
  }
}

export async function ensureAnonymousSession() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (session) {
    return session
  }

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    throw error
  }

  return data.session
}

export async function fetchTasks() {
  const [
    { data: tasks, error: tasksError },
    { data: comments, error: commentsError },
    { data: history, error: historyError },
  ] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: true }),
    supabase.from('task_comments').select('*').order('created_at', { ascending: true }),
    supabase.from('task_activity').select('*').order('created_at', { ascending: false }),
  ])

  if (tasksError) {
    throw tasksError
  }

  if (commentsError) {
    throw commentsError
  }

  if (historyError) {
    throw historyError
  }

  const commentsByTaskId = comments.reduce((grouped, comment) => {
    grouped[comment.task_id] ??= []
    grouped[comment.task_id].push(comment)
    return grouped
  }, {})

  const historyByTaskId = history.reduce((grouped, activity) => {
    grouped[activity.task_id] ??= []
    grouped[activity.task_id].push(activity)
    return grouped
  }, {})

  return tasks.map((task) => mapRowToTask(task, commentsByTaskId[task.id] ?? [], historyByTaskId[task.id] ?? []))
}

export async function insertTask(task) {
  const userResult = await supabase.auth.getUser()

  if (userResult.error) {
    throw userResult.error
  }

  const userId = userResult.data.user?.id

  if (!userId) {
    throw new Error('No authenticated Supabase user found.')
  }

  const payload = {
    title: task.title,
    description: task.description || null,
    status: task.status,
    user_id: userId,
    priority: mapPriorityToDb(task.priority),
    due_date: task.dueDate || null,
    assignee_name: task.assignee || 'Unassigned',
    tag: serializeTags(task.tags ?? task.tag ?? ['General']),
    completed: task.completed ?? false,
  }

  const { data, error } = await supabase.from('tasks').insert(payload).select().single()

  if (error) {
    throw error
  }

  return mapRowToTask(data, [], [])
}

export async function updateTask(taskId, updates) {
  const payload = {}

  if (updates.title !== undefined) {
    payload.title = updates.title
  }

  if (updates.description !== undefined) {
    payload.description = updates.description || null
  }

  if (updates.status !== undefined) {
    payload.status = updates.status
  }

  if (updates.assignee !== undefined) {
    payload.assignee_name = updates.assignee
  }

  if (updates.priority !== undefined) {
    payload.priority = mapPriorityToDb(updates.priority)
  }

  if (updates.dueDate !== undefined) {
    payload.due_date = updates.dueDate || null
  }

  if (updates.tag !== undefined) {
    payload.tag = serializeTags(updates.tag)
  }

  if (updates.tags !== undefined) {
    payload.tag = serializeTags(updates.tags)
  }

  if (updates.completed !== undefined) {
    payload.completed = updates.completed
  }

  const { data, error } = await supabase.from('tasks').update(payload).eq('id', taskId).select().single()

  if (error) {
    throw error
  }

  const [
    { data: comments, error: commentsError },
    { data: history, error: historyError },
  ] = await Promise.all([
    supabase.from('task_comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true }),
    supabase.from('task_activity').select('*').eq('task_id', taskId).order('created_at', { ascending: false }),
  ])

  if (commentsError) {
    throw commentsError
  }

  if (historyError) {
    throw historyError
  }

  return mapRowToTask(data, comments, history)
}

export async function deleteTask(taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)

  if (error) {
    throw error
  }
}

export async function insertTaskComment(taskId, message, fallbackAuthor = 'Guest User') {
  const userResult = await supabase.auth.getUser()

  if (userResult.error) {
    throw userResult.error
  }

  const user = userResult.data.user

  if (!user?.id) {
    throw new Error('No authenticated Supabase user found.')
  }

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      author: user.user_metadata?.display_name || fallbackAuthor,
      message,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapCommentRow(data)
}

export async function insertTaskActivity(taskId, actionType, metadata = {}, fallbackActor = 'Guest User') {
  const userResult = await supabase.auth.getUser()

  if (userResult.error) {
    throw userResult.error
  }

  const user = userResult.data.user

  if (!user?.id) {
    throw new Error('No authenticated Supabase user found.')
  }

  const { data, error } = await supabase
    .from('task_activity')
    .insert({
      task_id: taskId,
      user_id: user.id,
      actor: user.user_metadata?.display_name || fallbackActor,
      action_type: actionType,
      metadata,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return mapActivityRow(data)
}
