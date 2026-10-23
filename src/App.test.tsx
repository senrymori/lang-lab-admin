import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { learner, overview, serve } from './test/api'

const base = { 'GET /overview': overview, 'GET /spend?days=30': [], 'GET /alerts': [] }

describe('sign-in', () => {
  it('a wrong key stays out and says so, saying nothing of where keys live', async () => {
    serve({ 'GET /overview': [401, { detail: 'Unauthorized' }] })
    render(<App />)
    expect(screen.queryByText(/admin\.key|\/etc\//)).toBeNull()
    await userEvent.type(screen.getByPlaceholderText('Ключ'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Ключ не подходит')).toBeInTheDocument()
    expect(localStorage.getItem('langlab-admin-key')).toBeNull()
  })

  it('the right key opens the overview and goes with every request', async () => {
    const calls = serve(base)
    render(<App />)
    await userEvent.type(screen.getByPlaceholderText('Ключ'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('3 из 10')).toBeInTheDocument()
    expect(calls.every((c) => c.auth === 'Bearer secret')).toBe(true)
  })

  it('a key that stops working sends back to sign-in', async () => {
    localStorage.setItem('langlab-admin-key', 'old')
    serve({ ...base, 'GET /overview': [401, {}] })
    render(<App />)
    expect(await screen.findByPlaceholderText('Ключ')).toBeInTheDocument()
  })
})

describe('learners', () => {
  it('adds lessons and blocks with a confirmation', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#learners'
    const calls = serve({
      'GET /learners': [learner()],
      'PATCH /learners/u1': (body: unknown) => ({ ...learner(), ...(body as object) }),
    })
    window.confirm = () => true
    render(<App />)
    expect(await screen.findByText('3 из 12')).toBeInTheDocument()
    expect(screen.getByText('осталось 9')).toBeInTheDocument()
    const count = screen.getByLabelText('Сколько уроков добавить')
    await userEvent.clear(count)
    await userEvent.type(count, '5')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить уроки' }))
    await userEvent.click(screen.getByRole('button', { name: 'Заблокировать' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH').map((c) => c.body))
      .toEqual([{ add_lessons: 5 }, { status: 'blocked' }]))
  })

  it('shows why a learner was blocked', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#learners'
    serve({ 'GET /learners': [learner({ status: 'blocked', blocked_reason: 'накрутка токенов' })] })
    render(<App />)
    expect(await screen.findByText(/накрутка токенов/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Разблокировать' })).toBeInTheDocument()
  })
})

describe('codes', () => {
  it('a new invite: lessons, no time limit, copied', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#codes'
    const made = { code: 'LAB-NEW1-CODE', kind: 'invite', lessons: 12, days: null, used: 0, max_uses: 1, note: 'Боря',
      expires_at: null, active: true, created_at: '2026-10-23T10:00:00Z' }
    const calls = serve({ 'GET /codes': [], 'POST /codes': made })
    render(<App />)
    await userEvent.type(await screen.findByPlaceholderText('Аня, коллега'), 'Боря')
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }))
    expect(await screen.findByText('LAB-NEW1-CODE')).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual(
      { note: 'Боря', lessons: 12, days: null, kind: 'invite', max_uses: 1, expires_in_days: 14 })
  })
})
