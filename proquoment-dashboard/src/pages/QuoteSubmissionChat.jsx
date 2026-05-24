import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { submitQuotation } from '../lib/procurementApi'
import { submitBid } from '../lib/supplierApi'

const INITIAL_MESSAGES = [
  {
    id: 1,
    from: 'ai',
    text: "Hi! I'm Proquoment AI. I'll help you craft a competitive quote. Let's start — what product are you quoting on?",
    time: 'Just now',
  }
]

const AI_RESPONSES = [
  "Great! What quantity is the buyer requesting?",
  "Got it. What's your unit price, and can you offer any volume discounts?",
  "Perfect. What's your lead time for this quantity?",
  "Excellent! Do you have any relevant certifications or quality guarantees to mention?",
  "I've drafted a professional quote based on your inputs. Here's a summary:\n\n• Product: As specified\n• Price: Competitive with market\n• Lead Time: As indicated\n• Certifications: Included\n\nWould you like me to submit this quote to the buyer, or would you like to review and edit it first?",
  "Your quote has been submitted! The buyer will review it within 24 hours. You can track the status in My Bids.",
]

const SUBMIT_INDEX = 5

export default function QuoteSubmissionChat() {
  const { user, isDemo } = useAuth()
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [aiIndex, setAiIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [rfqContext] = useState({
    title: 'Steel Pipes Grade A',
    buyer: 'Buyer #037092c1',
    quantity: '500 units',
    deadline: 'Dec 15, 2024',
    budget: '$12,000 – $18,000',
  })
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendConfirmationEmail = async (rfq) => {
    if (!user?.email || emailSent) return
    setEmailSent(true)
    try {
      await fetch('/api/send-quote-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          rfq,
          bidRef: 'BID-' + Date.now(),
        }),
      })
    } catch (err) {
      console.error('Failed to send confirmation email', err)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = { id: Date.now(), from: 'user', text: input.trim(), time: 'Just now' }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    const delay = 1000 + Math.random() * 500
    setTimeout(() => {
      const nextIndex = aiIndex
      const aiText = AI_RESPONSES[nextIndex] || "Thank you! Your quote looks great. Is there anything else you'd like to add?"
      const aiMsg = { id: Date.now() + 1, from: 'ai', text: aiText, time: 'Just now' }
      setMessages(prev => [...prev, aiMsg])
      setAiIndex(prev => Math.min(prev + 1, AI_RESPONSES.length - 1))
      setIsTyping(false)
      if (nextIndex === SUBMIT_INDEX) {
        sendConfirmationEmail(rfqContext)
        // Persist to shared Supabase → notify Admin
        if (isDemo) {
          submitQuotation({
            rfqId: 'RFQ-MATCHED',
            unitPrice: 28.50,
            qty: 500,
            deliveryDays: 21,
            notes: 'Submitted via AI Quote Assistant',
          }).catch(err => console.error('submitQuotation:', err))
        } else {
          submitBid(
            'RFQ-MATCHED',
            user?.authUserId,
            user?.supplierId,
            user?.company || user?.name || 'Supplier',
            {
              qty: 500,
              unitPrice: 28.50,
              moq: 500,
              leadTime: 21,
              paymentTerms: 'Net 30',
              notes: 'Submitted via AI Quote Assistant'
            },
            false
          ).catch(err => console.error('submitBid:', err))
        }
      }
    }, delay)
  }

  const quickReplies = ['Get started', 'Review my draft', 'Submit now', 'Start over']

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left Panel — RFQ Context */}
      <div className="w-[340px] flex-shrink-0 bg-[#0f00da] text-white flex flex-col overflow-hidden">
        {/* Back button */}
        <div className="px-5 pt-5 pb-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#bfc1ff] hover:text-white text-sm transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </button>
        </div>

        {/* AI Header */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
              <span className="text-lg">✦</span>
            </div>
            <div>
              <p className="font-semibold text-white">AI Quote Assistant</p>
              <p className="text-xs text-[#bfc1ff]">Powered by Proquoment AI</p>
            </div>
          </div>
          <p className="text-sm text-[#bfc1ff]">I'll help you craft a competitive, professional quote based on your products and the RFQ requirements.</p>
        </div>

        {/* RFQ Context */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-xs font-semibold text-[#bfc1ff] uppercase tracking-wide mb-3">RFQ Context</p>
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] text-[#9394ff] uppercase">Product</p>
              <p className="text-sm text-white font-medium">{rfqContext.title}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#9394ff] uppercase">Buyer</p>
              <p className="text-sm text-white">{rfqContext.buyer}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-[#9394ff] uppercase">Quantity</p>
                <p className="text-sm text-white">{rfqContext.quantity}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#9394ff] uppercase">Deadline</p>
                <p className="text-sm text-white">{rfqContext.deadline}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[#9394ff] uppercase">Budget Range</p>
              <p className="text-sm text-white">{rfqContext.budget}</p>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="px-5 py-4 flex-1">
          <p className="text-xs font-semibold text-[#bfc1ff] uppercase tracking-wide mb-3">Tips for a Winning Quote</p>
          <div className="space-y-2.5">
            {[
              { icon: 'price_check', tip: 'Price competitively within the buyer\'s budget range' },
              { icon: 'schedule', tip: 'Offer the fastest delivery time you can reliably commit to' },
              { icon: 'verified', tip: 'Highlight relevant certifications' },
              { icon: 'handshake', tip: 'Offer flexible payment terms when possible' },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[16px] text-[#9394ff] flex-shrink-0 mt-0.5">{t.icon}</span>
                <p className="text-xs text-[#bfc1ff]">{t.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-4 border-b border-[#ebebeb] bg-white flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#e1e0ff] flex items-center justify-center">
            <span className="text-[#0f00da]">✦</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#111111]">Quote Submission Chat</p>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              AI Active
            </p>
          </div>
          <div className="flex gap-2 text-xs text-[#9e9e9e]">
            <button onClick={() => navigate('/matched-rfqs')} className="border border-[#ebebeb] px-3 py-1.5 rounded-full hover:bg-[#f5f5f5] text-[#555555] font-medium">View RFQ</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.from === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-[#e1e0ff] flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1 text-sm">✦</div>
              )}
              <div className={`max-w-[70%]`}>
                <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line ${msg.from === 'user' ? 'bg-[#0f00da] text-white rounded-br-sm' : 'bg-white text-[#111111] border border-[#ebebeb] rounded-bl-sm'}`}>
                  {msg.text}
                </div>
                <p className={`text-xs text-[#9e9e9e] mt-1 ${msg.from === 'user' ? 'text-right' : ''}`}>{msg.time}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-[#e1e0ff] flex items-center justify-center text-sm flex-shrink-0">✦</div>
              <div className="bg-white border border-[#ebebeb] rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#c6c4da] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-[#c6c4da] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-[#c6c4da] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        <div className="px-5 pb-2 flex gap-2 flex-wrap flex-shrink-0">
          {quickReplies.map(r => (
            <button key={r} onClick={() => setInput(r)} className="border border-[#c6c4da] text-[#555555] px-3 py-1.5 rounded-full text-xs hover:border-[#0f00da] hover:text-[#0f00da] transition-colors">
              {r}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-[#ebebeb] bg-white flex-shrink-0">
          <form onSubmit={handleSend} className="flex items-end gap-3">
            <div className="flex-1 border border-[#ebebeb] rounded-2xl px-4 py-2.5 bg-white focus-within:border-[#0f00da]">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your response..."
                className="w-full bg-transparent text-sm outline-none text-[#111111] placeholder-[#767589]"
              />
            </div>
            <button type="submit" disabled={!input.trim()} className="w-10 h-10 bg-[#0f00da] rounded-full flex items-center justify-center hover:bg-[#2d2dff] transition-colors disabled:opacity-50 flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-white">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
