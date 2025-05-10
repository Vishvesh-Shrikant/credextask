import { useState, useEffect, useRef } from "react";
import {
    motion,
    AnimatePresence,
    useScroll,
    useTransform,
    useSpring,
    useMotionValue,
    useInView,
} from "framer-motion";
// import OpenAI from "openai";

// const openai = new OpenAI({
//     apiKey: import.meta.env.VITE_PUBLIC_OPENAI_API_KEY, // correct Vite syntax
//     dangerouslyAllowBrowser: true, // required if using in the browser (not recommended)
// });
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;
// Custom components
const FloatingParticle = ({ size, color, delay }) => {
    const randomX = Math.random() * 100 - 50; // -50 to 50
    const randomDuration = 3 + Math.random() * 7; // 3-10s

    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: size,
                height: size,
                backgroundColor: color,
            }}
            initial={{ y: 100, opacity: 0, x: 0 }}
            animate={{
                y: -100,
                opacity: [0, 1, 0],
                x: randomX,
            }}
            transition={{
                duration: randomDuration,
                repeat: Infinity,
                delay: delay,
                ease: "easeInOut",
            }}
        />
    );
};

const GlowingCard = ({ children, className = "" }) => (
    <motion.div
        whileHover={{
            scale: 1.03,
            boxShadow: "0 0 25px rgba(59, 130, 246, 0.5)",
        }}
        className={`relative overflow-hidden rounded-2xl shadow-xl transition-all duration-500 ${className}`}
    >
        <motion.div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
        {children}
    </motion.div>
);

const StatCounter = ({ targetValue, suffix = "", duration = 2 }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const inView = useInView(ref);

    useEffect(() => {
        if (inView) {
            let start = 0;
            const end = parseInt(targetValue);
            const stepTime = Math.abs(Math.floor((duration * 1000) / end));

            const timer = setInterval(() => {
                start += 1;
                setCount(start);
                if (start >= end) clearInterval(timer);
            }, stepTime);

            return () => clearInterval(timer);
        }
    }, [inView, targetValue, duration]);

    return (
        <span ref={ref}>
            {count}
            {suffix}
        </span>
    );
};

// Tooltip component
const Tooltip = ({ text, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative inline-block">
            <div
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg whitespace-nowrap"
                    >
                        {text}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-solid border-t-gray-800 border-t-8 border-x-transparent border-x-8 border-b-0"></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Modern badge component
const Badge = ({ text, color = "blue" }) => {
    const colorClasses = {
        blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        purple: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    };

    return (
        <span
            className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${colorClasses[color]}`}
        >
            {text}
        </span>
    );
};

// Animated button with ripple effect
const RippleButton = ({ children, className, onClick }) => {
    const [rippleEffect, setRippleEffect] = useState({
        x: 0,
        y: 0,
        active: false,
    });
    const buttonRef = useRef(null);

    const handleClick = (e) => {
        const button = buttonRef.current;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setRippleEffect({ x, y, active: true });

        setTimeout(() => {
            setRippleEffect({ x, y, active: false });
        }, 500);

        if (onClick) onClick(e);
    };

    return (
        <motion.button
            ref={buttonRef}
            className={`relative overflow-hidden ${className}`}
            onClick={handleClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            {rippleEffect.active && (
                <motion.span
                    className="absolute bg-white/30 rounded-full"
                    initial={{
                        width: 0,
                        height: 0,
                        x: rippleEffect.x,
                        y: rippleEffect.y,
                        opacity: 0.5,
                    }}
                    animate={{
                        width: 500,
                        height: 500,
                        x: rippleEffect.x - 250,
                        y: rippleEffect.y - 250,
                        opacity: 0,
                    }}
                    transition={{ duration: 0.5 }}
                />
            )}
            {children}
        </motion.button>
    );
};

export default function LandingPage() {
    const [darkMode, setDarkMode] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Hi! How can I help you today? 👋" },
    ]);
    const [input, setInput] = useState("");
    const [mounted, setMounted] = useState(false);
    const [notification, setNotification] = useState(null);
    const [scrolledNav, setScrolledNav] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [activeSection, setActiveSection] = useState("");

    const messagesEndRef = useRef(null);

    // Set mounted state after initial render
    useEffect(() => {
        setMounted(true);

        // Set up scroll listener for navbar
        const handleScroll = () => {
            setScrolledNav(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll);

        // Show notification after delay
        const timer = setTimeout(() => {
            setNotification({
                message:
                    "🔥 New Feature: Sell software bundles for higher returns!",
            });
        }, 5000);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        const sectionIds = [
            "how-it-works",
            "why-choose-us",
            "testimonials",
            "contact",
        ];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: "-30% 0px -60% 0px", threshold: 0.1 }
        );

        sectionIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    // Auto-scroll to bottom of chat messages
    useEffect(() => {
        if (chatOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, chatOpen]);

    const { scrollYProgress } = useScroll();
    const scrollProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
    });

    // Transform values based on scroll
    const scale = useTransform(scrollProgress, [0, 0.5], [1, 1.05]);
    const opacity = useTransform(scrollProgress, [0, 0.3], [0.8, 1]);
    const heroY = useTransform(scrollProgress, [0, 0.3], [0, -50]);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 500) {
            showToast(
                "⚠️ Your message exceeds the 500-word limit. Please shorten it."
            );
            return;
        }

        const newMessages = [...messages, { role: "user", content: input }];
        setMessages([
            ...newMessages,
            { role: "assistant", content: "...", typing: true },
        ]);
        setInput("");

        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
            });
            if (!model) {
                console.error("Gemini model not found");
                return;
            }
            const filteredHistory = newMessages.filter(
                (m, i) => !(i === 0 && m.role === "assistant")
            );

            const history = filteredHistory.map((msg) => ({
                role: msg.role,
                parts: [{ text: msg.content }],
            }));

            const chat = model.startChat({
                model: "gemini-2.0-flash",
                history,
            });
            const result = await chat.sendMessage(input);
            const reply = result.response.text();

            setMessages([
                ...newMessages,
                { role: "assistant", content: reply },
            ]);
        } catch (err) {
            console.error("Gemini API Error:", err);
            setMessages([
                ...newMessages,
                {
                    role: "assistant",
                    content:
                        "⚠️ Sorry, I'm having trouble connecting to Gemini. Please try again.",
                },
            ]);
        }
    };

    // Scroll progress indicator
    const transformPageScroll = useTransform(
        scrollProgress,
        [0, 1],
        ["0%", "100%"]
    );

    return (
        <div
            className={`font-sans transition-colors duration-700 min-h-screen ${
                darkMode
                    ? "dark bg-gray-950 text-gray-100"
                    : "bg-gradient-to-br from-white via-blue-50 to-blue-100 text-gray-800"
            }`}
        >
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2"
                    >
                        <span>{toast}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 text-white/70 hover:text-white"
                        >
                            ✕
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scroll Progress Indicator */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600 z-50"
                style={{ scaleX: transformPageScroll, transformOrigin: "0%" }}
            />

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg"
                    >
                        <div className="flex items-center">
                            <p>{notification.message}</p>
                            <button
                                onClick={() => setNotification(null)}
                                className="ml-4 text-white/70 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navbar */}
            <motion.nav
                className={`fixed top-0 left-0 right-0 z-40 px-6 py-4 transition-all duration-300 ${
                    scrolledNav
                        ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md"
                        : "bg-transparent"
                }`}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <motion.div
                        className="flex items-center"
                        whileHover={{ scale: 1.05 }}
                    >
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                            SoftSell
                        </span>
                    </motion.div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-10">
                        <a
                            href="#how-it-works"
                            className={`font-medium transition-colors ${
                                activeSection === "how-it-works"
                                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                                    : "hover:text-blue-600 dark:hover:text-blue-400"
                            }`}
                        >
                            How It Works
                        </a>
                        <a
                            href="#why-choose-us"
                            className={`font-medium transition-colors ${
                                activeSection === "how-it-works"
                                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                                    : "hover:text-blue-600 dark:hover:text-blue-400"
                            }`}
                        >
                            Why Choose Us
                        </a>
                        <a
                            href="#testimonials"
                            className={`font-medium transition-colors ${
                                activeSection === "how-it-works"
                                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                                    : "hover:text-blue-600 dark:hover:text-blue-400"
                            }`}
                        >
                            Testimonials
                        </a>
                        <a
                            href="#contact"
                            className={`font-medium transition-colors ${
                                activeSection === "how-it-works"
                                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                                    : "hover:text-blue-600 dark:hover:text-blue-400"
                            }`}
                        >
                            Contact
                        </a>

                        <Tooltip
                            text={
                                darkMode
                                    ? "Switch to Light Mode"
                                    : "Switch to Dark Mode"
                            }
                        >
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2 rounded-full bg-blue-100 dark:bg-gray-800 text-blue-800 dark:text-blue-200"
                            >
                                {darkMode ? (
                                    <span className="text-yellow-500">☀️</span>
                                ) : (
                                    <span>🌙</span>
                                )}
                            </motion.button>
                        </Tooltip>
                    </div>

                    {/* Mobile Nav Toggle */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden text-2xl"
                    >
                        {isMenuOpen ? "✕" : "☰"}
                    </motion.button>
                </div>
            </motion.nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="fixed top-16 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg z-30 md:hidden overflow-hidden"
                    >
                        <div className="flex flex-col p-6 space-y-4">
                            <a
                                href="#how-it-works"
                                className="font-medium text-lg py-2 border-b border-gray-100 dark:border-gray-800"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                How It Works
                            </a>
                            <a
                                href="#why-choose-us"
                                className="font-medium text-lg py-2 border-b border-gray-100 dark:border-gray-800"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Why Choose Us
                            </a>
                            <a
                                href="#testimonials"
                                className="font-medium text-lg py-2 border-b border-gray-100 dark:border-gray-800"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Testimonials
                            </a>
                            <a
                                href="#contact"
                                className="font-medium text-lg py-2 border-b border-gray-100 dark:border-gray-800"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Contact
                            </a>
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-medium">Theme Mode</span>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setDarkMode(!darkMode)}
                                    className="flex items-center gap-2 bg-blue-100 dark:bg-gray-800 text-sm font-medium px-4 py-2 rounded-full"
                                >
                                    {darkMode ? (
                                        <>
                                            <span className="text-yellow-500">
                                                ☀️
                                            </span>{" "}
                                            Light
                                        </>
                                    ) : (
                                        <>
                                            <span>🌙</span> Dark
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Widget */}
            <div className="fixed bottom-6 right-6 z-50">
                <motion.button
                    whileHover={{
                        scale: 1.1,
                        boxShadow: "0 0 15px rgba(59, 130, 246, 0.5)",
                    }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setChatOpen(!chatOpen)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-full shadow-lg"
                >
                    {chatOpen ? "✕" : "💬"}
                </motion.button>

                <AnimatePresence>
                    {chatOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            transition={{ type: "spring", damping: 20 }}
                            className="absolute bottom-16 right-0 w-80 md:w-96 h-[32rem] bg-white dark:bg-gray-800 shadow-2xl rounded-2xl overflow-hidden border border-blue-100 dark:border-gray-700"
                        >
                            <div className="h-full flex flex-col">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 font-medium flex justify-between items-center">
                                    <div className="flex items-center">
                                        <div className="mr-2 relative">
                                            <div className="w-2 h-2 bg-green-400 rounded-full absolute bottom-0 right-0"></div>
                                            <span className="text-xl">🤖</span>
                                        </div>
                                        <div>
                                            <div className="font-bold">
                                                SoftSell Assistant
                                            </div>
                                            <div className="text-xs text-blue-100">
                                                Online • Typically replies
                                                instantly
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                                    {messages.map((msg, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            key={i}
                                            className={
                                                msg.role === "user"
                                                    ? "flex justify-end"
                                                    : "flex justify-start"
                                            }
                                        >
                                            <div
                                                className={`inline-block max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
                                                    msg.role === "user"
                                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                                                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-100 dark:border-gray-700"
                                                }`}
                                            >
                                                {msg.typing ? (
                                                    <div className="flex space-x-1">
                                                        <motion.div
                                                            animate={{
                                                                y: [0, -5, 0],
                                                            }}
                                                            transition={{
                                                                repeat: Infinity,
                                                                duration: 1,
                                                                delay: 0,
                                                            }}
                                                            className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full"
                                                        />
                                                        <motion.div
                                                            animate={{
                                                                y: [0, -5, 0],
                                                            }}
                                                            transition={{
                                                                repeat: Infinity,
                                                                duration: 1,
                                                                delay: 0.2,
                                                            }}
                                                            className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full"
                                                        />
                                                        <motion.div
                                                            animate={{
                                                                y: [0, -5, 0],
                                                            }}
                                                            transition={{
                                                                repeat: Infinity,
                                                                duration: 1,
                                                                delay: 0.4,
                                                            }}
                                                            className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full"
                                                        />
                                                    </div>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-3 border-t dark:border-gray-700">
                                    <form
                                        className="flex gap-2"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSend();
                                        }}
                                    >
                                        <input
                                            type="text"
                                            className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={input}
                                            onChange={(e) =>
                                                setInput(e.target.value)
                                            }
                                            placeholder="Type a message..."
                                        />
                                        <span
                                            className={`${
                                                countWords(input) > 300
                                                    ? "text-red-500"
                                                    : "text-gray-500 dark:text-gray-400"
                                            }`}
                                        >
                                            {countWords(input)} / 300 words
                                        </span>
                                        <RippleButton
                                            onClick={handleSend}
                                            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2 rounded-full"
                                        >
                                            <svg
                                                className="w-6 h-6"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                                />
                                            </svg>
                                        </RippleButton>
                                    </form>
                                    <div className="text-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Powered by AI • Your data is secure
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Hero Section */}
            <motion.section
                style={{ opacity, y: heroY }}
                className="min-h-screen flex flex-col justify-center items-center px-4 py-20 text-center relative"
            >
                {/* Floating Elements Background */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 pointer-events-none overflow-hidden z-0"
                >
                    {mounted && (
                        <>
                            {Array.from({ length: 20 }).map((_, i) => (
                                <FloatingParticle
                                    key={i}
                                    size={20 + Math.random() * 50}
                                    color={`rgba(59, 130, 246, ${
                                        0.05 + Math.random() * 0.1
                                    })`}
                                    delay={Math.random() * 5}
                                />
                            ))}

                            {/* Large decorative elements */}
                            <motion.div
                                className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/10 blur-3xl"
                                animate={{
                                    x: [0, 30, 0],
                                    y: [0, -30, 0],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 20,
                                    ease: "easeInOut",
                                }}
                            />

                            <motion.div
                                className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-gradient-to-r from-indigo-500/10 to-blue-500/20 blur-3xl"
                                animate={{
                                    x: [0, -30, 0],
                                    y: [0, 30, 0],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 25,
                                    ease: "easeInOut",
                                }}
                            />
                        </>
                    )}
                </motion.div>

                <div className="relative z-10 max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm py-2 px-4 rounded-full inline-block mb-6"
                    >
                        <div className="flex items-center gap-2">
                            <Badge
                                text="New"
                                color="green"
                            />
                            <span className="text-sm">
                                Now accepting enterprise license bundles!
                            </span>
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        className="text-5xl md:text-7xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-500"
                    >
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="inline-block"
                        >
                            Turn Unused Licenses
                        </motion.span>{" "}
                        <br className="md:hidden" />
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 1 }}
                            className="inline-block relative"
                        >
                            Into{" "}
                            <span className="relative inline-block">
                                Cash
                                <motion.div
                                    className="absolute -bottom-2 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ delay: 1.5, duration: 1 }}
                                />
                            </span>
                        </motion.span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, delay: 0.2 }}
                        className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto font-light"
                    >
                        Sell your unused software licenses instantly.
                        <motion.span
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.5, duration: 0.8 }}
                            className="font-semibold block mt-2"
                        >
                            Safe. Fast.{" "}
                            <span className="text-blue-600 dark:text-blue-400">
                                Profitable.
                            </span>
                        </motion.span>
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, type: "spring" }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <RippleButton className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-10 py-4 rounded-full text-lg font-medium shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10">
                            Sell My Licenses Now
                        </RippleButton>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 px-10 py-4 rounded-full text-lg font-medium transition-all border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center gap-2"
                        >
                            <span>Watch Demo</span>
                            <span className="bg-blue-100 dark:bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center">
                                ▶
                            </span>
                        </motion.button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5, duration: 1 }}
                        className="mt-12 flex flex-wrap justify-center gap-8"
                    >
                        <div className="flex items-center gap-2">
                            <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                                <StatCounter
                                    targetValue="8000"
                                    suffix="+"
                                />
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Licenses Sold
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                                <StatCounter
                                    targetValue="98"
                                    suffix="%"
                                />
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Customer Satisfaction
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                                <StatCounter targetValue="24" />
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Hour Processing
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                                <StatCounter
                                    targetValue="100"
                                    suffix="%"
                                />
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Secure Transactions
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* How It Works Section */}
            <motion.section
                id="how-it-works"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                viewport={{ once: true }}
                className="py-24 bg-white dark:bg-gray-950 px-4"
            >
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-white mb-12">
                        How It Works
                    </h2>
                    <div className="grid md:grid-cols-3 gap-10">
                        {[
                            {
                                title: "Upload License",
                                icon: "📤",
                                desc: "Submit the license details through our secure platform.",
                            },
                            {
                                title: "Get Instant Valuation",
                                icon: "💰",
                                desc: "Our AI engine provides a real-time resale value.",
                            },
                            {
                                title: "Get Paid",
                                icon: "⚡",
                                desc: "Receive payment quickly via your preferred method.",
                            },
                        ].map((step, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.2, duration: 0.6 }}
                                viewport={{ once: true }}
                                className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8 rounded-2xl shadow-lg"
                            >
                                <div className="text-5xl mb-4">{step.icon}</div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {step.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Why Choose Us Section */}
            <motion.section
                id="why-choose-us"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                viewport={{ once: true }}
                className="py-24 px-4 bg-gradient-to-b from-white to-blue-50 dark:from-gray-950 dark:to-gray-900"
            >
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-white mb-16">
                        Why Choose SoftSell
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                icon: "🔐",
                                title: "Secure Platform",
                                desc: "End-to-end encryption ensures your license data is always protected.",
                            },
                            {
                                icon: "⚡",
                                title: "Fast Transactions",
                                desc: "Get valuations and payments in under 24 hours.",
                            },
                            {
                                icon: "📈",
                                title: "Best Market Rates",
                                desc: "Our pricing engine ensures you always get the best value.",
                            },
                            {
                                icon: "🤝",
                                title: "Trusted by Thousands",
                                desc: "10K+ licenses sold with 98% satisfaction rate.",
                            },
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.2, duration: 0.6 }}
                                viewport={{ once: true }}
                                className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300"
                            >
                                <div className="text-4xl mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>
            {/* Testimonials Section */}
            {/* Testimonials Section */}
            <motion.section
                id="testimonials"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                viewport={{ once: true }}
                className="py-24 px-4 bg-white dark:bg-gray-950"
            >
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-white mb-16">
                        What Our Customers Say
                    </h2>
                    <div className="grid md:grid-cols-2 gap-10">
                        {[
                            {
                                name: "Priya Desai",
                                role: "IT Procurement Manager",
                                company: "TechNova Inc.",
                                quote: "SoftSell helped us recover value from licenses we thought were useless. The process was shockingly fast and smooth.",
                            },
                            {
                                name: "Daniel Kim",
                                role: "CFO",
                                company: "CloudPilot",
                                quote: "Within 24 hours we got a great quote and cash in the bank. Total game-changer for license asset management.",
                            },
                        ].map((testimonial, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.2, duration: 0.6 }}
                                viewport={{ once: true }}
                                className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-100 dark:border-gray-700 rounded-2xl p-8 text-left shadow-xl hover:shadow-2xl transition-shadow duration-300"
                            >
                                <div className="text-5xl text-blue-500 mb-4">
                                    “
                                </div>
                                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-6">
                                    {testimonial.quote}
                                </p>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {testimonial.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {testimonial.role} •{" "}
                                        {testimonial.company}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Contact Section */}
            <motion.section
                id="contact"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                viewport={{ once: true }}
                className="py-24 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-gray-900"
            >
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-white mb-10">
                        Get in Touch
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-12 text-lg">
                        Let us know what licenses you want to sell or ask us
                        anything.
                    </p>

                    <form
                        className="space-y-6 text-left"
                        onSubmit={(e) => {
                            e.preventDefault();
                            alert("Form submitted! (frontend only)");
                        }}
                    >
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                    Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="John Doe"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                    Email
                                </label>
                                <input
                                    required
                                    type="email"
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                Company
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="SoftCorp Ltd."
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                License Type
                            </label>
                            <select
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a license type</option>
                                <option value="office">Microsoft Office</option>
                                <option value="adobe">
                                    Adobe Creative Cloud
                                </option>
                                <option value="autodesk">Autodesk</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                Message
                            </label>
                            <textarea
                                required
                                rows={4}
                                placeholder="Tell us more about your software or question..."
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            ></textarea>
                        </div>

                        <div className="text-center pt-4">
                            <RippleButton className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-full shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all">
                                Submit Form
                            </RippleButton>
                        </div>
                    </form>
                </div>
            </motion.section>
        </div>
    );
}
