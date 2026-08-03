import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { Plus, Globe, Megaphone, AppWindow, Mic, Send, ExternalLink } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import FishboneRoadmap from "./FishboneRoadmap";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

const FISHBONE_API_URL = `${API_BASE_URL}/api/fishbone`;

function App() {
  const { logout, user } = useAuth0();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const generateId = () => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getCurrentConversation = () => {
    return conversations.find(conv => conv.id === activeConversationId) || { messages: [] };
  };

  // Save conversations to localStorage
  useEffect(() => {
    localStorage.setItem('chatbot_conversations', JSON.stringify(conversations));
  }, [conversations]);

  const createNewConversation = useCallback(() => {
    const newId = generateId();
    const newConversation = {
      id: newId,
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
  }, []);

  // Load conversations from localStorage on startup
  useEffect(() => {
    const savedConversations = localStorage.getItem('chatbot_conversations');
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations);
  
      // If no conversations or empty messages, create default conversation
      if (parsed.length === 0 || !parsed[0].messages || parsed[0].messages.length === 0) {
        const defaultConversation = {
          id: generateId(),
          title: "New Chat",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setConversations([defaultConversation]);
        setActiveConversationId(defaultConversation.id);
        localStorage.setItem('chatbot_conversations', JSON.stringify([defaultConversation]));
      } else {
        setConversations(parsed);
        setActiveConversationId(parsed[0].id);
      }
    } else {
      createNewConversation();
    }
  }, [createNewConversation]);

  // Theme logic removed - single palette used

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeConversationId, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const updateConversationTitle = (conversationId, firstMessage) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId && conv.title === "New Chat") {
        return {
          ...conv,
          title: firstMessage.length > 50 
            ? firstMessage.substring(0, 50) + "..."
            : firstMessage,
          updatedAt: new Date()
        };
      }
      return conv;
    }));
  };

  const deleteConversation = (conversationId, e) => {
    e.stopPropagation();
    
    if (conversations.length === 1) {
      createNewConversation();
    } else {
      setConversations(prev => {
        const filtered = prev.filter(conv => conv.id !== conversationId);
        if (activeConversationId === conversationId && filtered.length > 0) {
          setActiveConversationId(filtered[0].id);
        }
        return filtered;
      });
    }
  };

  const switchToConversation = (conversationId) => {
    setActiveConversationId(conversationId);
  };

  // Theme toggle removed

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = {
      sender: "user",
      text: input.trim(),
      timestamp: new Date(),
    };

    const currentConv = getCurrentConversation();
    const updatedMessages = [...currentConv.messages, userMessage];
    
    setConversations(prev => prev.map(conv => 
      conv.id === activeConversationId 
        ? { ...conv, messages: updatedMessages, updatedAt: new Date() }
        : conv
    ));

    if (currentConv.title === "New Chat") {
      updateConversationTitle(activeConversationId, userMessage.text);
    }

    setInput("");
    setIsTyping(true);

    try {
      const query = encodeURIComponent(userMessage.text);
      const requestUrl = `${FISHBONE_API_URL}?q=${query}&k=25`;
      
      console.log("Making request to:", requestUrl);
      
      // Fetch fishbone roadmap data
      const fishboneRes = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Check if response is ok before parsing JSON
      if (!fishboneRes.ok) {
        const errorText = await fishboneRes.text();
        throw new Error(`Server error: ${fishboneRes.status} ${fishboneRes.statusText}. ${errorText.substring(0, 100)}`);
      }
      
      // Clone response to handle potential JSON parsing errors
      const fishboneResClone = fishboneRes.clone();
      
      let fishboneData;
      try {
        fishboneData = await fishboneRes.json();
      } catch (jsonError) {
        // If JSON parsing fails, read the response as text to show what we actually got
        const text = await fishboneResClone.text();
        throw new Error(`Failed to parse JSON response. The server may have returned HTML instead of JSON. Response: ${text.substring(0, 200)}`);
      }
      
      if (fishboneData.error) {
        throw new Error(fishboneData.error);
      }

      // Debug logging
      console.log("Fishbone data received:", fishboneData);
      console.log("Articles:", fishboneData.articles?.length || 0);
      console.log("Videos:", fishboneData.videos?.length || 0);

      // Add fishbone roadmap as a bot message
      const botReply = {
        sender: "bot",
        text: `I've found ${fishboneData.total_articles || 0} articles and ${fishboneData.total_videos || 0} videos for "${fishboneData.query || 'your query'}". Here's your learning roadmap:`,
        timestamp: new Date(),
        fishboneData: fishboneData // Store the fishbone data in the message
      };
      
      setTimeout(() => {
        setConversations(prev => prev.map(conv => 
          conv.id === activeConversationId 
            ? { 
                ...conv, 
                messages: [...updatedMessages, botReply],
                updatedAt: new Date()
              }
            : conv
        ));
        setIsTyping(false);
      }, 1000);
    } catch (err) {
      console.error("Error fetching fishbone roadmap:", err);
      console.error("Request URL was:", `${FISHBONE_API_URL}?q=${encodeURIComponent(userMessage.text)}&k=25`);
      
      // Provide more helpful error message based on error type
      let errorText = "I'm having trouble connecting to the search service right now. Please try again in a moment.";
      
      if (err.message.includes("404") || err.message.includes("Not Found")) {
        errorText = `The backend server endpoint was not found. Please make sure the backend server is running on http://localhost:5001 and the /api/fishbone endpoint is available. Error details: ${err.message}`;
      } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        errorText = "Unable to connect to the backend server. Please make sure the backend server is running on http://localhost:5001.";
      } else if (err.message.includes("Server error")) {
        errorText = `Server error: ${err.message}. Please check if the backend server is running correctly.`;
      }
      
      setTimeout(() => {
        const errorMessage = {
          sender: "bot",
          text: errorText,
          timestamp: new Date(),
        };
        setConversations(prev => prev.map(conv => 
          conv.id === activeConversationId 
            ? { 
                ...conv, 
                messages: [...updatedMessages, errorMessage],
                updatedAt: new Date()
              }
            : conv
        ));
        setIsTyping(false);
      }, 1000);
    }
  };

  const renderLineWithLinks = (text) => {
    if (!text) return text;
    
    // Create a new regex instance for each text to avoid state issues
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    
    try {
      // Reset regex state and process the text
      const matches = [];
      let match;
      while ((match = linkRegex.exec(text)) !== null) {
        matches.push({
          fullMatch: match[0],
          text: match[1],
          url: match[2],
          index: match.index
        });
      }
      
      // Process matches in order
      matches.forEach((matchData, matchIndex) => {
        // Add text before the link
        if (matchData.index > lastIndex) {
          parts.push(text.slice(lastIndex, matchData.index));
        }
        
        // Ensure we have valid match groups and they're not empty
        if (matchData.text && matchData.url && matchData.text.trim() && matchData.url.trim()) {
          const linkText = matchData.text.trim();
          const linkUrl = matchData.url.trim();
          
          // Validate URL format
          if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
            // Add the link
            parts.push(
              <a 
                key={`link-${matchData.index}-${matchIndex}`}
                href={linkUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="roadmap-link"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  try {
                    window.open(linkUrl, '_blank');
                  } catch (error) {
                    console.error('Error opening link:', error);
                  }
                }}
              >
                {linkText}
                <ExternalLink size={12} className="link-icon" />
              </a>
            );
          } else {
            // Invalid URL format, just add as text
            parts.push(matchData.fullMatch);
          }
        } else {
          // If match groups are invalid or empty, just add the original text
          parts.push(matchData.fullMatch);
        }
        
        lastIndex = matchData.index + matchData.fullMatch.length;
      });
    } catch (error) {
      console.error('Error parsing links:', error);
      return text;
    }
    
    // Add remaining text after the last link
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentConversation = getCurrentConversation();

  return (
    <div className="app">

      
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          <div className="search-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input type="text" placeholder="Search" />
          </div>

          <div className="nav-section">
            <div className="nav-item active">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>Learnora</span>
            </div>
            <div className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 11H7v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9h-2v7H9v-7z"/>
                <path d="M13.5 2.5h-3l-1 1h-3.5v2h12v-2h-3.5l-1-1z"/>
              </svg>
              <span>GPTs</span>
            </div>
          </div>

          {/* New Chat Button */}
          <button className="new-chat-btn" onClick={createNewConversation}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span>New Chat</span>
          </button>

          {/* Conversation History */}
          <div className="conversation-history">
            {conversations.map((conv) => (
              <div 
                key={conv.id} 
                className={`conversation-item ${activeConversationId === conv.id ? 'active' : ''}`}
                onClick={() => switchToConversation(conv.id)}
              >
                <span>{conv.title}</span>
                <button 
                  className="delete-conversation-btn"
                  onClick={(e) => deleteConversation(conv.id, e)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.picture ? (
                <img src={user.picture} alt={user.name || 'User'} className="user-avatar-img" />
              ) : (
                <span>{user?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              {user?.email && <span className="user-email">{user.email}</span>}
            </div>
          </div>
          
          <button 
            className="logout-btn"
            onClick={() => {
              logout({ 
                returnTo: window.location.origin + '/login',
                federated: false
              });
            }}
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div className="header-title">
            <h1>Learnora</h1>
          </div>
          <div className="header-actions">
            <button className="action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </button>
          </div>
        </header>

        <div className="chat-area">
          <div className="messages-container">
            {/* Show title when no messages */}
            {(!currentConversation.messages || currentConversation.messages.length === 0) && (
              <div className="chat-title-section">
                <h1 className="chat-title">Learnora</h1>
                <p className="chat-subtitle">
                  Your AI assistant powered by advanced language understanding. 
                  Ask me anything and I'll help you find the information you need.
                </p>
              </div>
            )}

            {/* Show messages when conversation has messages */}
            {currentConversation.messages && currentConversation.messages.length > 0 && 
              currentConversation.messages.map((msg, idx) => (
                <div key={idx} className={`message-group ${msg.sender}`}>
                  <div className="message-content">
                    <div className="message-text">
                      {msg.sender === "bot" && msg.fishboneData ? (
                        <div className="fishbone-inline">
                          <div>{renderLineWithLinks(msg.text)}</div>
                          <FishboneRoadmap data={msg.fishboneData} inline={true} />
                        </div>
                      ) : msg.sender === "bot" && msg.roadmapData ? (
                        <div className="roadmap-response">
                          {msg.text.split('\n').map((line, lineIdx) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return <h3 key={lineIdx} className="roadmap-step-title">{line.replace(/\*\*/g, '')}</h3>;
                            } else if (line.startsWith('---')) {
                              return <hr key={lineIdx} className="roadmap-divider" />;
                            } else if (line.match(/^\d+\./)) {
                              return <div key={lineIdx} className="roadmap-item">{line}</div>;
                            } else if (line.startsWith('   ')) {
                              return <div key={lineIdx} className="roadmap-item-detail">
                                {renderLineWithLinks(line)}
                              </div>;
                            } else if (line.trim() === '') {
                              return <br key={lineIdx} />;
                            } else {
                              return <div key={lineIdx}>{renderLineWithLinks(line)}</div>;
                            }
                          })}
                        </div>
                      ) : (
                        <div>{renderLineWithLinks(msg.text)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            {isTyping && (
              <div className="message-group bot">
                <div className="typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Updated Input Section */}
        <div className="input-area">
          <div className="input-container">
            <div className="input-wrapper">
              
              {/* Left Icons */}
              <div className="input-icons">
                <button className="input-icon-btn" title="Add">
                  <Plus size={20} />
                </button>
                <button className="input-icon-btn" title="Language">
                  <Globe size={20} />
                </button>
                <button className="input-icon-btn" title="Announcements">
                  <Megaphone size={20} />
                </button>
                <button className="input-icon-btn" title="Apps">
                  <AppWindow size={20} />
                </button>
              </div>

              {/* Chat Input */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask anything"
                className="message-input"
                rows="1"
              />
              
              {/* Right Icons */}
              <div className="input-right-icons">
                <button className="input-icon-btn" title="Voice Input">
                  <Mic size={20} />
                </button>
                <button 
                  className="send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  title="Send Message"
                >
                  <Send size={20} />
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
