import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Course } from "@/types";

const WHATSAPP_ICON = (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface ChatMessage {
  role: "user" | "bot";
  content: string;
}

const QUICK_REPLIES = [
  "কোর্সের বিবরণ জানতে চাই",
  "এনরোলমেন্ট প্রক্রিয়া",
  "পেমেন্ট কিভাবে করব?",
  "সাপোর্টে যোগাযোগ",
];

const KEYWORD_RESPONSES: Record<string, string> = {
  "কোর্স": "আমাদের সকল কোর্স দেখতে [হোমপেজ](/) ভিজিট করুন। প্রতিটি কোর্সের বিস্তারিত তথ্য পেতে 'View Details' বাটনে ক্লিক করুন।",
  "course": "আমাদের সকল কোর্স দেখতে [হোমপেজ](/) ভিজিট করুন।",
  "এনরোলমেন্ট": "**এনরোলমেন্ট প্রক্রিয়া:**\n\n1️⃣ প্রথমে আপনার পছন্দের কোর্স সিলেক্ট করুন\n2️⃣ 'Enroll Now' বাটনে ক্লিক করুন\n3️⃣ রেজিস্ট্রেশন ফর্মে নাম, ইমেইল ও পাসওয়ার্ড দিন\n4️⃣ পেমেন্ট মেথড সিলেক্ট করে নির্ধারিত নাম্বারে পেমেন্ট করুন\n5️⃣ ট্রানজ্যাকশন আইডি ও পেমেন্ট স্ক্রিনশট আপলোড করুন\n6️⃣ অ্যাডমিন আপনার পেমেন্ট ভেরিফাই করলে কোর্স অ্যাক্সেস পাবেন\n\n⏳ অনুমোদন না হওয়া পর্যন্ত আপনার অ্যাকাউন্ট 'pending' অবস্থায় থাকবে।",
  "enroll": "**Enrollment Process:**\n\n1️⃣ Select your preferred course\n2️⃣ Click 'Enroll Now'\n3️⃣ Fill in name, email & password\n4️⃣ Make payment to the given number\n5️⃣ Upload transaction ID & payment screenshot\n6️⃣ Admin will verify and approve your access\n\n⏳ Your account stays 'pending' until approved.",
  "পেমেন্ট": "**পেমেন্ট নির্দেশিকা:**\n\n💳 কোর্সে এনরোল করতে নির্ধারিত পেমেন্ট মেথডে (বিকাশ/নগদ/রকেট) টাকা পাঠান।\n\n📝 পেমেন্ট করার পর:\n- ট্রানজ্যাকশন আইডি (TrxID) কপি করুন\n- পেমেন্ট স্ক্রিনশট তুলে রাখুন\n- রেজিস্ট্রেশন ফর্মে এই তথ্যগুলো দিন\n\n✅ অ্যাডমিন ভেরিফাই করলেই কোর্স অ্যাক্সেস পাবেন!",
  "payment": "**Payment Guide:**\n\n💳 Send payment via the specified method (bKash/Nagad/Rocket).\n\n📝 After payment:\n- Copy the Transaction ID\n- Take a payment screenshot\n- Submit both in the registration form\n\n✅ You'll get access once admin verifies!",
  "রুটিন": "ক্লাস রুটিন দেখতে আপনার কোর্সের ডিটেইলস পেজে যান অথবা 'Routine PDF' লিংকে ক্লিক করুন।",
  "routine": "Check your class routine from the course details page or the 'Routine PDF' link.",
  "সাপোর্ট": "**যোগাযোগের মাধ্যম:**\n\n📱 WhatsApp: নিচের WhatsApp বাটন থেকে সরাসরি মেসেজ করুন\n💬 ডিসকাশন গ্রুপ: আপনার কোর্সের ডিসকাশন গ্রুপে জয়েন করুন\n\nআমরা যত দ্রুত সম্ভব আপনার সমস্যার সমাধান করব! 🙂",
  "support": "**Contact Options:**\n\n📱 WhatsApp: Use the WhatsApp button below\n💬 Discussion Group: Join your course's discussion group\n\nWe'll help you as soon as possible! 🙂",
  "contact": "**Contact Options:**\n\n📱 WhatsApp: Use the WhatsApp button below\n💬 Discussion Group: Join your course's discussion group",
  "যোগাযোগ": "**যোগাযোগের মাধ্যম:**\n\n📱 WhatsApp: নিচের WhatsApp বাটন থেকে সরাসরি মেসেজ করুন\n💬 ডিসকাশন গ্রুপ: আপনার কোর্সের ডিসকাশন গ্রুপে জয়েন করুন",
  "ভিডিও": "ভিডিও দেখতে প্রথমে লগইন করুন এবং আপনার কোর্সে যান। My Courses পেজে সকল ভিডিও পাবেন।",
  "video": "To watch videos, please login and go to your course from the My Courses page.",
  "লগইন": "**লগইন করতে:**\n\n1️⃣ [লগইন পেজে](/auth?mode=login) যান\n2️⃣ আপনার ইমেইল ও পাসওয়ার্ড দিন\n3️⃣ লগইন বাটনে ক্লিক করুন\n\n❓ অ্যাকাউন্ট নেই? প্রথমে একটি কোর্সে এনরোল করুন, তাহলে অটোমেটিক অ্যাকাউন্ট তৈরি হবে।",
  "login": "**To Login:**\n\n1️⃣ Go to the [login page](/auth?mode=login)\n2️⃣ Enter email & password\n3️⃣ Click Login\n\n❓ No account? Enroll in a course first — your account will be created automatically.",
  "রেজিস্ট্রেশন": "**রেজিস্ট্রেশন করতে:**\n\n1️⃣ হোমপেজ থেকে কোর্স সিলেক্ট করুন\n2️⃣ 'Enroll Now' ক্লিক করুন\n3️⃣ ফর্মে নাম, ইমেইল, পাসওয়ার্ড দিন\n4️⃣ পেমেন্ট তথ্য দিন (মেথড, নাম্বার, TrxID, স্ক্রিনশট)\n5️⃣ সাবমিট করুন ও অ্যাডমিন অনুমোদনের জন্য অপেক্ষা করুন",
  "register": "**To Register:**\n\n1️⃣ Select a course from homepage\n2️⃣ Click 'Enroll Now'\n3️⃣ Fill in name, email, password\n4️⃣ Provide payment details (method, number, TrxID, screenshot)\n5️⃣ Submit and wait for admin approval",
  "pending": "আপনার অ্যাকাউন্ট এখনও 'pending' থাকলে, অ্যাডমিন আপনার পেমেন্ট ভেরিফাই করছেন। সাধারণত কিছুক্ষণের মধ্যেই অনুমোদন হয়ে যায়। সমস্যা হলে WhatsApp এ যোগাযোগ করুন।",
  "অপেক্ষা": "আপনার অ্যাকাউন্ট অনুমোদনের জন্য অপেক্ষা করুন। অ্যাডমিন পেমেন্ট ভেরিফাই করলেই কোর্স অ্যাক্সেস পাবেন। দীর্ঘ সময় লাগলে WhatsApp এ জানান।",
  "হ্যালো": "হ্যালো! 👋 আমি আপনাকে কিভাবে সাহায্য করতে পারি?",
  "hello": "Hello! 👋 How can I help you?",
  "hi": "Hello! 👋 How can I help you today?",
  "ধন্যবাদ": "আপনাকেও ধন্যবাদ! 😊 আর কোনো প্রশ্ন থাকলে জানাবেন।",
  "thanks": "You're welcome! 😊 Let me know if you have any other questions.",
  "বিবরণ": "কোর্সের বিস্তারিত তথ্য জানতে হোমপেজ থেকে কোর্স সিলেক্ট করে 'View Details' বাটনে ক্লিক করুন। সেখানে ওভারভিউ, ইন্সট্রাক্টর, রুটিন সহ সকল তথ্য পাবেন।",
  "price": "কোর্সের মূল্য জানতে কোর্স ডিটেইলস পেজ দেখুন। প্রতিটি কোর্সের মূল্য সেখানে উল্লেখ আছে।",
  "দাম": "কোর্সের মূল্য জানতে কোর্স ডিটেইলস পেজ দেখুন। প্রতিটি কোর্সের মূল্য সেখানে উল্লেখ আছে।",
  "মূল্য": "কোর্সের মূল্য জানতে কোর্স ডিটেইলস পেজ দেখুন। প্রতিটি কোর্সের মূল্য সেখানে উল্লেখ আছে।",
};

function getCourseResponse(course: Course | null, message: string): string | null {
  if (!course) return null;
  const lower = message.toLowerCase();
  
  const courseKeywords = ["এই কোর্স", "কোর্সের", "কোর্স সম্পর্কে", "course", "details", "বিবরণ", "ডিটেইলস", "overview", "ওভারভিউ"];
  const priceKeywords = ["দাম", "মূল্য", "price", "cost", "টাকা", "কত"];
  const instructorKeywords = ["শিক্ষক", "instructor", "teacher", "ইন্সট্রাক্টর", "স্যার", "ম্যাডাম"];
  const subjectKeywords = ["সাবজেক্ট", "subject", "বিষয়", "কি কি পড়ানো"];
  const routineKeywords = ["রুটিন", "routine", "সময়সূচী", "schedule"];
  
  if (routineKeywords.some(k => lower.includes(k))) {
    if (course.routinePDF) {
      return `📅 **${course.courseName}** এর রুটিন:\n\n[📄 রুটিন PDF দেখুন](${course.routinePDF})`;
    }
    return `এই কোর্সে এখনও রুটিন আপলোড করা হয়নি।`;
  }
  
  if (instructorKeywords.some(k => lower.includes(k))) {
    if (course.instructors?.length > 0) {
      const list = course.instructors.map(i => `👨‍🏫 **${i.name}** — ${i.subject}`).join("\n");
      return `**${course.courseName}** এর ইন্সট্রাক্টরবৃন্দ:\n\n${list}`;
    }
    return "এই কোর্সের ইন্সট্রাক্টর তথ্য এখনও আপডেট করা হয়নি।";
  }
  
  if (subjectKeywords.some(k => lower.includes(k))) {
    if (course.subjects?.length > 0) {
      const list = course.subjects.map(s => {
        const chapters = s.chapters?.length ? ` (${s.chapters.length}টি চ্যাপ্টার)` : "";
        return `📚 ${s.subjectName}${chapters}`;
      }).join("\n");
      return `**${course.courseName}** এর সাবজেক্টসমূহ:\n\n${list}`;
    }
    return "এই কোর্সের সাবজেক্ট তথ্য এখনও আপডেট করা হয়নি।";
  }
  
  if (priceKeywords.some(k => lower.includes(k))) {
    return `💰 **${course.courseName}** এর মূল্য: **৳${course.price}**\n\nএনরোল করতে 'Enroll Now' বাটনে ক্লিক করুন!`;
  }
  
  if (courseKeywords.some(k => lower.includes(k))) {
    let response = `📖 **${course.courseName}**\n\n💰 মূল্য: ৳${course.price}\n`;
    if (course.overview?.length > 0) {
      response += `\n**ওভারভিউ:**\n${course.overview.map(p => `• ${p}`).join("\n")}\n`;
    }
    if (course.subjects?.length > 0) {
      response += `\n📚 **সাবজেক্ট:** ${course.subjects.map(s => s.subjectName).join(", ")}\n`;
    }
    if (course.instructors?.length > 0) {
      response += `\n👨‍🏫 **ইন্সট্রাক্টর:** ${course.instructors.map(i => i.name).join(", ")}\n`;
    }
    if (course.routinePDF) {
      response += `\n📅 [রুটিন PDF দেখুন](${course.routinePDF})`;
    }
    response += `\n\nএনরোল করতে নিচের 'Enroll Now' বাটনে ক্লিক করুন!`;
    return response;
  }
  
  return null;
}

function getBotResponse(message: string, course?: Course | null): string {
  // First check course-specific responses
  const courseResponse = getCourseResponse(course || null, message);
  if (courseResponse) return courseResponse;
  
  const lower = message.toLowerCase();
  for (const [keyword, response] of Object.entries(KEYWORD_RESPONSES)) {
    if (lower.includes(keyword.toLowerCase())) return response;
  }
  return "আপনার প্রশ্নটি বুঝতে পারিনি। নিচের অপশন থেকে বেছে নিন অথবা আরো বিস্তারিত লিখুন। 🙂";
}

interface FloatingButtonsProps {
  course?: Course | null;
}

export function FloatingButtons({ course }: FloatingButtonsProps = {}) {
  const settings = useAppSettings();
  const { userDoc } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = userDoc?.role === "admin";

  const [chatOpen, setChatOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "bot", content: `স্বাগতম! 👋 আমি ${settings.appName || "LMS"} এর সহায়ক বট। আপনাকে কিভাবে সাহায্য করতে পারি?` }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const waMessages = useRef<{ role: "user"; content: string }[]>([]);
  const [waHistory, setWaHistory] = useState<{ role: "user"; content: string }[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, typing]);

  if (isAdmin || pathname.startsWith("/admin")) return null;

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setTyping(true);

    setTimeout(() => {
      const response = getBotResponse(text, course);
      setChatMessages(prev => [...prev, { role: "bot", content: response }]);
      setTyping(false);
    }, 800 + Math.random() * 500);
  };

  const sendWhatsApp = () => {
    if (!whatsappInput.trim()) return;
    const whatsappNumber = settings.socialLinks?.find(s => s.name.toLowerCase().includes("whatsapp"))?.link || "";
    const number = whatsappNumber.replace(/\D/g, "");
    // Add to local history
    setWaHistory(prev => [...prev, { role: "user", content: whatsappInput }]);
    if (number) {
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(whatsappInput)}`, "_blank");
    }
    setWhatsappInput("");
  };

  const closeAll = () => {
    setChatOpen(false);
    setWhatsappOpen(false);
    setMenuOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-3 sm:right-4 z-40 flex flex-col gap-3 items-end">
      {/* Chatbot popup */}
      {chatOpen && (
        <div className="w-[calc(100vw-1.5rem)] max-w-96 h-[28rem] bg-card border border-border rounded-xl shadow-lg flex flex-col overflow-hidden animate-fade-in">
          <div className="p-3 bg-primary text-primary-foreground flex items-center justify-between rounded-t-xl">
            <span className="text-sm font-medium">💬 Chat Assistant</span>
            <button onClick={() => setChatOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => (
                        <a href={href} className="underline font-medium text-primary" target={href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a>
                      )
                    }}
                  >{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="px-3 pb-1 flex gap-1 flex-wrap">
            {QUICK_REPLIES.map((qr, i) => (
              <button key={i} onClick={() => sendMessage(qr)} className="text-xs px-2 py-1 rounded-full border border-border bg-background text-foreground hover:bg-accent whitespace-nowrap transition-colors">{qr}</button>
            ))}
          </div>
          <div className="p-2 border-t border-border flex items-center gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(chatInput)}
              placeholder="মেসেজ লিখুন..."
              className="flex-1 min-w-0 px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm"
            />
            <button onClick={() => sendMessage(chatInput)} className="shrink-0 p-2.5 rounded-md bg-primary text-primary-foreground">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp chat popup */}
      {whatsappOpen && (
        <div className="w-[calc(100vw-1.5rem)] max-w-96 h-[28rem] bg-card border border-border rounded-xl shadow-lg flex flex-col overflow-hidden animate-fade-in">
          <div className="p-3 bg-[#25D366] text-white flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-sm font-medium">WhatsApp</span>
            </div>
            <button onClick={() => setWhatsappOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Welcome message */}
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted text-foreground">
                আসসালামু আলাইকুম! 👋 আপনার মেসেজ লিখুন, Send বাটনে ক্লিক করলে সরাসরি WhatsApp এ পাঠানো হবে।
              </div>
            </div>
            {waHistory.map((msg, i) => (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-[#25D366] text-white">
                  {msg.content}
                  <div className="text-[10px] text-white/70 mt-1 text-right">✓ WhatsApp এ পাঠানো হয়েছে</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border flex items-center gap-2">
            <input
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendWhatsApp()}
              placeholder="WhatsApp মেসেজ লিখুন..."
              className="flex-1 min-w-0 px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm"
            />
            <button onClick={sendWhatsApp} className="shrink-0 p-2.5 rounded-md bg-[#25D366] text-white">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded buttons - WhatsApp & Chatbot */}
      {menuOpen && !chatOpen && !whatsappOpen && (
        <div className="flex flex-col gap-3 items-end animate-fade-in">
          {/* WhatsApp button */}
          <button
            onClick={() => { setWhatsappOpen(true); setMenuOpen(false); }}
            className="p-3.5 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform"
          >
            {WHATSAPP_ICON}
          </button>

          {/* Chatbot button */}
          <button
            onClick={() => { setChatOpen(true); setMenuOpen(false); }}
            className="p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Main FAB toggle */}
      <button
        onClick={() => {
          if (chatOpen || whatsappOpen) { closeAll(); }
          else { setMenuOpen(!menuOpen); }
        }}
        className="p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
      >
        {chatOpen || whatsappOpen || menuOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}