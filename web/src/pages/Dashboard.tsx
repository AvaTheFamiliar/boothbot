import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [bots, setBots] = useState<any[]>([])
  const [newBotToken, setNewBotToken] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBots()
  }, [])

  const loadBots = async () => {
    const result = await api.getBots()
    if (result.data) {
      setBots(result.data)
    }
    setLoading(false)
  }

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBotToken.trim()) return
    
    const result = await api.createBot(newBotToken)
    if (result.data) {
      setBots([...bots, result.data])
      setNewBotToken('')
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">BoothBot</h1>
          <div className="flex items-center gap-4">
            <span>{user?.email}</span>
            <button onClick={logout} className="text-red-600 hover:underline">Logout</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Bot</h2>
          <form onSubmit={handleAddBot} className="flex gap-4">
            <input
              type="text"
              value={newBotToken}
              onChange={(e) => setNewBotToken(e.target.value)}
              placeholder="Paste your Telegram bot token from @BotFather"
              className="flex-1 border rounded px-4 py-2"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Add Bot
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Your Bots</h2>
          {bots.length === 0 ? (
            <p className="text-gray-500">No bots yet. Add one above!</p>
          ) : (
            <div className="space-y-4">
              {bots.map((bot) => (
                <div key={bot.id} className="border rounded p-4">
                  <div className="font-medium">@{bot.username}</div>
                  <div className="text-sm text-gray-500">ID: {bot.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
