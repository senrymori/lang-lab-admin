import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { learner, overview, serve } from './test/api'

const base = { 'GET /overview': overview, 'GET /spend?days=30': [], 'GET /alerts': [], 'GET /learners': [] }

describe('sign-in', () => {
  it('a wrong key stays out and says so, saying nothing of where keys live', async () => {
    serve({ 'GET /overview': [401, { detail: 'Unauthorized' }] })
    render(<App />)
    expect(screen.queryByText(/admin\.key|\/etc\//)).toBeNull()
    await userEvent.type(screen.getByLabelText('Ключ'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'Открыть журнал' }))
    expect(await screen.findByText(/^Ключ не подходит/)).toBeInTheDocument()
    expect(localStorage.getItem('langlab-admin-key')).toBeNull()
  })

  it('the right key opens the overview and goes with every request', async () => {
    const calls = serve(base)
    render(<App />)
    await userEvent.type(screen.getByLabelText('Ключ'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Открыть журнал' }))
    expect(await screen.findByRole('img', { name: 'Занято 3 места из 10' })).toBeInTheDocument()
    expect(calls.every((c) => c.auth === 'Bearer secret')).toBe(true)
  })

  it('a key that stops working sends back to sign-in', async () => {
    localStorage.setItem('langlab-admin-key', 'old')
    serve({ ...base, 'GET /overview': [401, {}] })
    render(<App />)
    expect(await screen.findByLabelText('Ключ')).toBeInTheDocument()
  })
})

describe('learners', () => {
  it('adds lessons and blocks with a confirmation', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#learners'
    const calls = serve({
      'GET /learners': [learner()],
      'GET /overview': overview,
      'PATCH /learners/u1': (body: unknown) => ({ ...learner(), ...(body as object) }),
    })
    window.confirm = () => true
    render(<App />)
    expect(await screen.findByText('3 из 12')).toBeInTheDocument()
    expect(screen.getByText('осталось 9')).toBeInTheDocument()
    expect(screen.getByText('Занято 1 место из 10')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Добавить уроки' }))
    expect(screen.getByRole('button', { name: 'Добавить 12 уроков' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Своё число уроков'), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить 5 уроков' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Ещё действия: Аня' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Заблокировать' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH').map((c) => c.body))
      .toEqual([{ add_lessons: 5 }, { status: 'blocked' }]))
  })

  it('sets the number of lessons outright, never below those done; lessons ran out come first', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#learners'
    const calls = serve({
      'GET /learners': [learner(), learner({ id: 'u2', name: 'Дана', email: 'd@example.com', lessons_used: 12 })],
      'GET /overview': overview,
      'PATCH /learners/u1': (body: unknown) => ({ ...learner(), ...(body as object) }),
    })
    render(<App />)
    const groups = (await screen.findAllByText(/^(Уроки закончились|Учатся)$/)).map((e) => e.textContent)
    expect(groups).toEqual(['Уроки закончились', 'Учатся'])
    expect(screen.getByText(/все пройдены/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ещё действия: Аня' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Изменить число уроков' }))
    const total = screen.getByLabelText('Сколько уроков всего')
    await userEvent.clear(total)
    await userEvent.type(total, '2')
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    await userEvent.clear(total)
    await userEvent.type(total, '8')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH').map((c) => c.body)).toEqual([{ add_lessons: -4 }]))
  })

  it('shows why a learner was blocked', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#learners'
    serve({ 'GET /learners': [learner({ status: 'blocked', blocked_reason: 'накрутка токенов' })], 'GET /overview': overview })
    render(<App />)
    expect(await screen.findByText(/накрутка токенов/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Разблокировать' })).toBeInTheDocument()
  })

  it('a lesson going tells a learner there from one who stepped away', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#learners'
    serve({ 'GET /learners': [
      learner({ live: 'placement', presence: { state: 'live' } }),
      learner({ id: 'u2', name: 'Гриша', email: 'g@example.com', live: 'placement', presence: { state: 'paused', why: 'app' } }),
      learner({ id: 'u3', name: 'Алмаз', email: 'al@example.com', live: 'learn', presence: { state: 'paused', why: 'idle', idle_min: 12 } }),
    ], 'GET /overview': overview })
    render(<App />)
    expect(await screen.findByText('1 сейчас на уроке')).toBeInTheDocument()
    expect(screen.getByText('2 на паузе')).toBeInTheDocument()
    expect(screen.getByText(/определяет уровень · /)).toBeInTheDocument()
    expect(screen.getByText(/проверка уровня на паузе — приложение закрыто или Мак спит/)).toBeInTheDocument()
    expect(screen.getByText(/урок на паузе — ничего не делает 12 мин/)).toBeInTheDocument()
  })
})

describe('codes', () => {
  const lists = { 'GET /learners': [], 'GET /overview': overview }

  it('a new invite: the name the tutor will use, lessons, no time limit, copied', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#codes'
    const made = { code: 'LAB-NEW1-CODE', kind: 'invite', name: 'Боря', email: null, sent: false, lessons: 12, days: null,
      used: 0, max_uses: 1, note: '', expires_at: null, active: true, created_at: '2026-10-23T10:00:00Z' }
    const calls = serve({ 'GET /codes': [], 'POST /codes': made, ...lists })
    render(<App />)
    await userEvent.type(await screen.findByLabelText('Имя'), 'Боря')
    expect(screen.getByText('Боря получит 12 уроков без срока.', { exact: false })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Создать код' }))
    expect(await screen.findByText('LAB-NEW1-CODE')).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual(
      { name: 'Боря', email: '', note: '', lessons: 12, days: null, kind: 'invite', max_uses: 1, expires_in_days: 14 })
  })

  it('a promo: how many may come in, where it is posted', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#codes'
    const made = { code: 'TG-ZIMA', kind: 'promo', name: '', email: null, sent: false, lessons: 6, days: 30, used: 0,
      max_uses: 100, note: 'телеграм', expires_at: null, active: true, created_at: '2026-10-23T10:00:00Z' }
    const calls = serve({ 'GET /codes': [], 'POST /codes': made, ...lists })
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Промо для канала' }))
    expect(await screen.findByText('Свободных мест сейчас 7')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Где опубликуешь'), 'телеграм')
    await userEvent.click(screen.getByRole('button', { name: '100' }))
    await userEvent.click(screen.getByRole('button', { name: '6' }))
    await userEvent.click(within(screen.getByRole('group', { name: 'За сколько их пройти' })).getByRole('button', { name: '30 дней' }))
    expect(screen.getByText(/Войдут до 100 человек, каждому 6 уроков за 30 дней/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Создать код' }))
    expect(await screen.findByText('Код готов:')).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual(
      { name: '', email: '', note: 'телеграм', lessons: 6, days: 30, kind: 'promo', max_uses: 100, expires_in_days: 14 })
  })

  it('codes are grouped: still waiting, used (by whom), switched off', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#codes'
    const code = (over: object) => ({ code: 'X', kind: 'invite', name: 'Аня', email: null, sent: false, lessons: 12, days: null,
      used: 0, max_uses: 1, note: '', expires_at: null, active: true, created_at: '2026-10-23T10:00:00Z', ...over })
    const calls = serve({
      'GET /codes': [code({ code: 'LAB-WAIT' }), code({ code: 'LAB-USED', used: 1 }), code({ code: 'LAB-OFF', active: false })],
      'GET /learners': [learner({ code: 'LAB-USED', name: 'Анна' })], 'GET /overview': overview,
      'PATCH /codes/LAB-OFF': { code: 'LAB-OFF', active: true },
    })
    render(<App />)
    expect(await screen.findByText('Действуют 1, использованы 1, отключены 1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Анна' })).toHaveAttribute('href', '#learners')
    await userEvent.click(screen.getByRole('button', { name: 'Включить' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ active: true }))
  })

  it('an invite with an address goes out by mail and can be sent again', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#codes'
    const made = { code: 'LAB-MAIL-CODE', kind: 'invite', name: 'Вера', email: 'vera@example.com', sent: true, lessons: 12,
      days: null, used: 0, max_uses: 1, note: '', expires_at: null, active: true, created_at: '2026-10-23T10:00:00Z' }
    const calls = serve({ 'GET /codes': [made], 'POST /codes': made, 'POST /codes/LAB-MAIL-CODE/send': made, ...lists })
    render(<App />)
    await userEvent.type(await screen.findByLabelText('Имя'), 'Вера')
    await userEvent.type(screen.getByLabelText('Почта'), 'vera@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Создать и отправить' }))
    expect(await screen.findByText('Приглашение ушло на vera@example.com. Код:')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Отправить ещё раз' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/codes/LAB-MAIL-CODE/send')).toBe(true))
  })
})

describe('requests', () => {
  it('invites from a request with its address, and dismisses another after asking', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#requests'
    const req = (id: number, name: string, email: string) => ({ id, name, email, created_at: '2026-10-24T09:00:00Z' })
    const calls = serve({
      'GET /requests': [req(1, 'Анна Петрова', 'anna@example.com'), req(2, 'Боря', 'b@example.com')],
      'POST /codes': (body: { email: string }) => ({ code: 'LAB-AAAA-BBBB', sent: true, email: body.email }),
      'DELETE /requests/2': { ok: true },
    })
    window.confirm = () => true
    render(<App />)
    expect(await screen.findByText('Ждут ответа 2')).toBeInTheDocument()
    const [first] = screen.getAllByRole('button', { name: 'Пригласить' })
    await userEvent.click(first)
    expect(screen.getByLabelText('Имя')).toHaveValue('Анна')
    await userEvent.click(screen.getByRole('button', { name: '24' }))
    await userEvent.click(screen.getByRole('button', { name: 'Отправить приглашение' }))
    expect(await screen.findByText('Приглашение ушло на anna@example.com. Код:')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ещё действия: Боря' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Отклонить' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/requests/2')).toBe(true))
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({
      kind: 'invite', name: 'Анна', email: 'anna@example.com', lessons: 24, days: null, max_uses: 1, request: 1,
    })
  })
})

describe('spend', () => {
  it('the overview splits the month by service, shows the free allowances and the fixed costs', async () => {
    serve({ 'GET /overview': overview, 'GET /spend?days=30': [], 'GET /alerts': [], 'GET /learners': [] })
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#overview'
    render(<App />)
    expect(await screen.findByText('Репетитор')).toBeInTheDocument()
    expect(screen.getByText('$12.00')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^120.000 из 500.000$/ })).toBeInTheDocument()
    expect(screen.getByText('сумма не указана')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Подробнее →' })).toHaveAttribute('href', '#spend')
  })
})

describe('feedback', () => {
  it('a row per learner and language; the mean opens every answer', async () => {
    localStorage.setItem('langlab-admin-key', 'k')
    location.hash = '#feedback'
    serve({ 'GET /feedback': [{ learner_id: 'u1', name: 'Аня', email: 'a@example.com', lang: 'es', level: 'B1-', rating: 4,
      items: [
        { sid: 'l1', ts: '2026-10-24T10:00:00Z', mode: 'learn', rating: 5, liked: ['допрос свидетеля'], comment: 'Отлично' },
        { sid: 'p1', ts: '2026-10-20T10:00:00Z', mode: 'placement', rating: 3, disliked: ['диктант'], why: 'быстро' },
      ] }] })
    render(<App />)
    expect(await screen.findByText('Испанский')).toBeInTheDocument()
    expect(screen.getByText('B1-')).toBeInTheDocument()
    expect(screen.getByText('Отлично')).toBeInTheDocument()
    expect(screen.queryByText('Определение уровня')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /4,0/ }))
    expect(screen.getByText('Определение уровня')).toBeInTheDocument()
    expect(screen.getByText('допрос свидетеля', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('быстро', { exact: false })).toBeInTheDocument()
  })
})
