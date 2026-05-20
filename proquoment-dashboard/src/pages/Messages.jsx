import { useState, useRef, useEffect } from 'react'
import { getConversations, sendMessage as dbSendMessage } from '../lib/db'

const conversations = [
  {
    id: 1,
    name: 'Sunrise Manufacturing LLC',
    avatar: 'SM',
    lastMessage: 'Can you provide a revised quote with faster delivery?',
    time: '10:32 AM',
    unread: 2,
    online: true,
    messages: [
      { id: 1, from: 'them', text: 'Hello, we reviewed your bid for Steel Pipes RFQ-2024-001.', time: '9:00 AM' },
      { id: 2, from: 'me', text: 'Thank you for considering our bid. How can I help?', time: '9:05 AM' },
      { id: 3, from: 'them', text: "We're interested but the delivery time is a bit long. Can you do 14 days instead of 21?", time: '9:10 AM' },
      { id: 4, from: 'me', text: 'Let me check with our logistics team. We might be able to expedite if we source locally.', time: '9:15 AM' },
      { id: 5, from: 'them', text: 'That would be great. Also, what certifications do you hold for Grade A steel?', time: '10:20 AM' },
      { id: 6, from: 'them', text: 'Can you provide a revised quote with faster delivery?', time: '10:32 AM' },
    ]
  },
  {
    id: 2,
    name: 'Gulf Construction Co.',
    avatar: 'GC',
    lastMessage: 'Please send the product data sheet for DN50 valves.',
    time: 'Yesterday',
    unread: 0,
    online: false,
    messages: [
      { id: 1, from: 'them', text: 'We received your bid for Industrial Valves.', time: 'Yesterday 2:00 PM' },
      { id: 2, from: 'me', text: 'Great! Do you have any specific requirements?', time: 'Yesterday 2:15 PM' },
      { id: 3, from: 'them', text: 'Please send the product data sheet for DN50 valves.', time: 'Yesterday 3:30 PM' },
    ]
  },
  {
    id: 3,
    name: 'Al Futtaim Industries',
    avatar: 'AF',
    lastMessage: "Your bid looks competitive. We'll review by Friday.",
    time: 'Mon',
    unread: 0,
    online: true,
    messages: [
      { id: 1, from: 'them', text: 'We have reviewed your bid for hydraulic fittings.', time: 'Mon 10:00 AM' },
      { id: 2, from: 'me', text: 'We can guarantee quality and timely delivery.', time: 'Mon 10:30 AM' },
      { id: 3, from: 'them', text: "Your bid looks competitive. We'll review by Friday.", time: 'Mon 11:00 AM' },
    ]
  },
  {
    id: 4,
    name: 'Emirates Steel Corp',
    avatar: 'ES',
    lastMessage: 'Can we schedule a call to discuss the order?',
    time: 'Nov 20',
    unread: 1,
    online: false,
    messages: [
      { id: 1, from: 'them', text: 'We want to discuss the flanges order further.', time: 'Nov 20 9:00 AM' },
      { id: 2, from: 'them', text: 'Can we schedule a call to discuss the order?', time: 'Nov 20 9:05 AM' },
    ]
  },
]

export default function Messages() {
  const [convList, setConvList] = useState(conversations)
  const [activeConv, setActiveConv] = useState(conversations[0])
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(conversations[0].messages)
  const [search, setSearch] = useState('')
  const [mobileView, setMobileView] = useState('list')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    getConversations().then(data => {
      if (data && data.length) {
        setConvList(data)
        setActiveConv(data[0])
        setMessages(data[0].messages)
      }
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelect = (conv) => {
    setActiveConv(conv)
    setMessages(conv.messages)
    setMobileView('chat')
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    const optimistic = { id: Date.now(), from: 'me', text, time: 'Just now' }
    setMessages(prev => [...prev, optimistic])
    const saved = await dbSendMessage(activeConv.id, text)
    if (saved) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m))
    }
  }

  const filtered = convList.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left: Conversation List */}
      <div className={`
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
        w-full md:w-[30%] md:min-w-[260px] flex-col border-r border-[#ebebeb] bg-white overflow-hidden
      `}>
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <h1 className="text-lg font-semibold text-[#111111] mb-3">Messages</h1>
          <div className="flex items-center gap-2 bg-[#f7f7f7] rounded-full px-3 py-2">
            <span className="material-symbols-outlined text-[18px] text-[#9e9e9e]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="bg-transparent text-sm outline-none flex-1 text-[#111111] placeholder-[#767589]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map(conv => (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-[#f3f3f3] hover:bg-[#fafafa] transition-colors ${activeConv.id === conv.id ? 'bg-[#f7f7f7]' : ''}`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#e1e0ff] text-[#0f00da] flex items-center justify-center text-xs font-bold">
                  {conv.avatar}
                </div>
                {conv.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-medium text-[#111111] truncate">{conv.name}</p>
                  <span className="text-xs text-[#9e9e9e] flex-shrink-0 ml-2">{conv.time}</span>
                </div>
                <p className="text-xs text-[#9e9e9e] truncate">{conv.lastMessage}</p>
              </div>
              {conv.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#0f00da] text-white text-xs flex items-center justify-center flex-shrink-0 mt-1">
                  {conv.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Chat Panel */}
      <div className={`
        ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
        flex-1 flex-col overflow-hidden
      `}>
        {/* Chat Header */}
        <div className="px-4 md:px-5 py-4 border-b border-[#ebebeb] bg-white flex items-center gap-3 flex-shrink-0">
          <button
            className="md:hidden w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center flex-shrink-0"
            onClick={() => setMobileView('list')}
          >
            <span className="material-symbols-outlined text-[20px] text-[#555555]">arrow_back</span>
          </button>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-[#e1e0ff] text-[#0f00da] flex items-center justify-center text-xs font-bold">
              {activeConv.avatar}
            </div>
            {activeConv.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#111111] truncate">{activeConv.name}</p>
            <p className="text-xs text-[#9e9e9e]">{activeConv.online ? 'Online' : 'Offline'}</p>
          </div>
          <div className="flex gap-1">
            <button className="w-9 h-9 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">call</span>
            </button>
            <button className="hidden sm:flex w-9 h-9 rounded-full hover:bg-[#f5f5f5] items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">video_call</span>
            </button>
            <button className="w-9 h-9 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[20px] text-[#9e9e9e]">more_vert</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              {msg.from === 'them' && (
                <div className="w-7 h-7 rounded-full bg-[#e1e0ff] text-[#0f00da] flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 self-end mb-1">
                  {activeConv.avatar[0]}
                </div>
              )}
              <div className={`max-w-[75%] sm:max-w-[65%] ${msg.from === 'me' ? 'order-1' : ''}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.from === 'me' ? 'bg-[#0f00da] text-white rounded-br-sm' : 'bg-white text-[#111111] border border-[#ebebeb] rounded-bl-sm'}`}>
                  {msg.text}
                </div>
                <p className={`text-xs text-[#9e9e9e] mt-1 ${msg.from === 'me' ? 'text-right' : ''}`}>{msg.time}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 md:px-5 py-4 border-t border-[#ebebeb] bg-white flex-shrink-0">
          <form onSubmit={handleSend} className="flex items-end gap-3">
            <div className="flex-1 border border-[#ebebeb] rounded-2xl flex items-center px-4 py-2.5 gap-2 bg-white focus-within:border-[#0f00da]">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm outline-none text-[#111111] placeholder-[#767589]"
              />
              <button type="button" className="flex-shrink-0 hidden sm:block">
                <span className="material-symbols-outlined text-[20px] text-[#9e9e9e] hover:text-[#0f00da]">attach_file</span>
              </button>
            </div>
            <button type="submit" disabled={!input.trim()} className="w-10 h-10 bg-[#0f00da] rounded-full flex items-center justify-center hover:bg-[#2d2dff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-white">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
