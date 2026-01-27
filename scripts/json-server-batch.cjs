const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('src/api/mock-todos.json')
const middlewares = jsonServer.defaults()

server.use(middlewares)
server.use(jsonServer.bodyParser)

// Batch delete endpoint
server.delete('/todos/batch', (req, res) => {
  const ids = req.body.ids
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be array' })
  ids.forEach(id => {
    router.db.get('todos').remove({ id }).write()
  })
  res.status(200).json({ deleted: ids })
})

// Batch upsert endpoint
server.post('/todos/batch', (req, res) => {
  const todos = req.body.todos
  if (!Array.isArray(todos)) return res.status(400).json({ error: 'todos must be array' })
  todos.forEach(todo => {
    const existing = router.db.get('todos').find({ id: todo.id }).value()
    if (existing) {
      router.db.get('todos').find({ id: todo.id }).assign(todo).write()
    } else {
      router.db.get('todos').push(todo).write()
    }
  })
  res.status(200).json({ todos })
})

server.use(router)
server.listen(3001, () => {
  console.log('JSON Server with batch endpoints is running on port 3001')
})
