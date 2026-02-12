import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware'
import { supabase } from '../../db/client'
import { findBotsByTenantId } from '../../db/repositories/bot.repository'
import type { JWTPayload } from '../../lib/auth'

const stats = new Hono()

stats.use('/*', authMiddleware)

// Get aggregated stats for all tenant's bots
stats.get('/', async (c) => {
  const tenant = c.get('tenant') as JWTPayload

  try {
    // Get all bot IDs for this tenant
    const bots = await findBotsByTenantId(tenant.tenantId)
    const botIds = bots.map(b => b.id)

    if (botIds.length === 0) {
      return c.json({
        success: true,
        data: {
          totalLeads: 0,
          leadsByDay: [],
          leadsBySource: [],
          leadsByBot: [],
          recentLeads: []
        }
      })
    }

    // Total leads
    const { count: totalLeads } = await supabase
      .from('bb_visitors')
      .select('*', { count: 'exact', head: true })
      .in('bot_id', botIds)

    // Leads by day (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: dailyData } = await supabase
      .from('bb_visitors')
      .select('created_at')
      .in('bot_id', botIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Aggregate by day
    const dayMap = new Map<string, number>()
    for (const row of dailyData || []) {
      const day = row.created_at.split('T')[0]
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    }
    
    // Fill in missing days with 0
    const leadsByDay: { date: string; count: number }[] = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      leadsByDay.push({
        date: dateStr,
        count: dayMap.get(dateStr) || 0
      })
    }

    // Leads by source
    const { data: sourceData } = await supabase
      .from('bb_visitors')
      .select('source')
      .in('bot_id', botIds)

    const sourceMap = new Map<string, number>()
    for (const row of sourceData || []) {
      const source = row.source || 'direct'
      const category = source.startsWith('event:') ? 'event' : 'direct'
      sourceMap.set(category, (sourceMap.get(category) || 0) + 1)
    }
    
    const leadsBySource = Array.from(sourceMap.entries()).map(([source, count]) => ({
      source,
      count
    }))

    // Leads by bot
    const leadsByBot = await Promise.all(
      bots.map(async (bot) => {
        const { count } = await supabase
          .from('bb_visitors')
          .select('*', { count: 'exact', head: true })
          .eq('bot_id', bot.id)
        return {
          botId: bot.id,
          username: bot.username,
          count: count || 0
        }
      })
    )

    // Recent leads (last 10)
    const { data: recentLeads } = await supabase
      .from('bb_visitors')
      .select('id, full_name, telegram_username, company, source, created_at, bot_id')
      .in('bot_id', botIds)
      .order('created_at', { ascending: false })
      .limit(10)

    // Add bot username to recent leads
    const botMap = new Map(bots.map(b => [b.id, b.username]))
    const recentWithBot = (recentLeads || []).map(lead => ({
      ...lead,
      bot_username: botMap.get(lead.bot_id) || 'unknown'
    }))

    return c.json({
      success: true,
      data: {
        totalLeads: totalLeads || 0,
        leadsByDay,
        leadsBySource,
        leadsByBot,
        recentLeads: recentWithBot
      }
    })
  } catch (error) {
    console.error('Stats error:', error)
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500)
  }
})

export default stats
