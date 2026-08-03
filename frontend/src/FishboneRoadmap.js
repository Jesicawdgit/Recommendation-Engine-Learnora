import React from 'react';
import { ExternalLink, Play, FileText, Star } from 'lucide-react';
import './FishboneRoadmap.css';

// Function to extract YouTube video ID and get thumbnail
const getYouTubeThumbnail = (url) => {
  if (!url) return null;
  
  // Extract video ID from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
  }
  
  return null;
};

const FishboneRoadmap = ({ data, onClose, inline = false }) => {
  // Debug logging
  console.log("FishboneRoadmap received data:", data);
  console.log("Articles array:", data?.articles);
  console.log("Videos array:", data?.videos);
  
  const isEmpty = !data || (!data.articles?.length && !data.videos?.length);
  const renderLink = (item) => {
    if (!item.link) return null;
    
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        // Validate the URL
        new URL(item.link);
        // Open in new tab
        window.open(item.link, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error('Invalid URL:', item.link);
        // Fallback: try to open anyway
        window.open(item.link, '_blank', 'noopener,noreferrer');
      }
    };
    
    try {
      const url = new URL(item.link);
      const linkText = url.hostname + url.pathname;
      return (
        <a 
          href={item.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="resource-link"
          onClick={handleClick}
        >
          {linkText}
          <ExternalLink size={12} />
        </a>
      );
    } catch (error) {
      return (
        <a 
          href={item.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="resource-link"
          onClick={handleClick}
        >
          {item.link}
          <ExternalLink size={12} />
        </a>
      );
    }
  };

  const renderScore = (score) => {
    if (!score) return null;
    const percentage = Math.round(score * 100);
    return (
      <div className="score-badge">
        <Star size={12} />
        {percentage}%
      </div>
    );
  };

  const handleCardClick = (link) => {
    if (link) {
      try {
        window.open(link, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error('Error opening link:', error);
      }
    }
  };

  const handleCardClickEvent = (e) => {
    const link = e.currentTarget.getAttribute('data-link');
    if (link) {
      handleCardClick(link);
    }
  };

  // Add click handlers to remaining video cards (only for non-inline version)
  React.useEffect(() => {
    if (!inline) {
      const videoCards = document.querySelectorAll('.resource-card.video-card');
      videoCards.forEach(card => {
        const link = card.getAttribute('data-link');
        if (link && !card.hasAttribute('data-click-handler')) {
          card.setAttribute('data-click-handler', 'true');
          card.addEventListener('click', () => handleCardClick(link));
        }
      });
    }
  }, [data, inline]);

  if (isEmpty) {
    if (inline) {
      return (
        <div className="fishbone-inline-container">
          <p className="no-results">No learning resources found for this query. Try rephrasing your question.</p>
        </div>
      );
    }
    return (
      <div className="fishbone-container">
        <div className="fishbone-header">
          <h2>Learning Roadmap for "{data?.query}"</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="fishbone-content">
          <p className="no-results">No learning resources found for this query. Try rephrasing your question.</p>
        </div>
      </div>
    );
  }

  if (inline) {
    return (
      <div className="fishbone-inline-container">
        <div className="fishbone-inline-spine">
          <div className="spine-line"></div>
          <div className="spine-node">
            <div className="node-content">
              <h3>{data.query}</h3>
              <p>Your Learning Journey</p>
            </div>
          </div>
        </div>
        
        <div className="fishbone-inline-branches">
          {/* Articles Branch */}
          <div className="branch articles-branch">
            <div className="branch-header">
              <FileText size={20} />
              <h3>Articles & Documentation</h3>
              <span className="count-badge">{data.total_articles}</span>
            </div>
            
            <div className="branch-content">
              {data.articles?.map((article, index) => (
                <div 
                  key={article.id} 
                  className="resource-card article-card"
                  data-link={article.link}
                  onClick={handleCardClickEvent}
                >
                  <div className="resource-header">
                    <div className="resource-number">{article.id}</div>
                    <div className="resource-title">{article.title}</div>
                    {renderScore(article.similarity_score)}
                  </div>
                  
                  <div className="resource-details">
                    <div className="resource-source">
                      <span className="source-label">Source:</span>
                      <span className="source-value">{article.source}</span>
                    </div>
                    
                    {article.labels?.length > 0 && (
                      <div className="resource-tags">
                        {article.labels.slice(0, 3).map((label, idx) => (
                          <span key={idx} className="tag">{label}</span>
                        ))}
                      </div>
                    )}
                    
                    {renderLink(article)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Videos Branch */}
          <div className="branch videos-branch">
            <div className="branch-header">
              <Play size={20} />
              <h3>Video Tutorials</h3>
              <span className="count-badge">{data.total_videos}</span>
            </div>
            
            <div className="branch-content">
              {data.videos?.map((video, index) => {
                const thumbnailUrl = getYouTubeThumbnail(video.link);
                return (
                  <div 
                    key={video.id} 
                    className="resource-card video-card"
                    data-link={video.link}
                    onClick={handleCardClickEvent}
                  >
                    {thumbnailUrl && (
                      <div className="video-thumbnail">
                        <img 
                          src={thumbnailUrl} 
                          alt={video.title}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="play-overlay">
                          <Play size={32} />
                        </div>
                      </div>
                    )}
                    <div className="resource-header">
                      <div className="resource-number">{video.id}</div>
                      <div className="resource-title">{video.title}</div>
                      {renderScore(video.similarity_score)}
                    </div>
                    
                    <div className="resource-details">
                      <div className="resource-source">
                        <span className="source-label">Source:</span>
                        <span className="source-value">{video.source}</span>
                      </div>
                      
                      {video.labels?.length > 0 && (
                        <div className="resource-tags">
                          {video.labels.slice(0, 3).map((label, idx) => (
                            <span key={idx} className="tag">{label}</span>
                          ))}
                        </div>
                      )}
                      
                      {renderLink(video)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fishbone-container">
      <div className="fishbone-header">
        <h2>Learning Roadmap for "{data.query}"</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="fishbone-content">
        <div className="fishbone-spine">
          <div className="spine-line"></div>
          <div className="spine-node">
            <div className="node-content">
              <h3>{data.query}</h3>
              <p>Your Learning Journey</p>
            </div>
          </div>
        </div>
        
        <div className="fishbone-branches">
          {/* Articles Branch */}
          <div className="branch articles-branch">
            <div className="branch-header">
              <FileText size={20} />
              <h3>Articles & Documentation</h3>
              <span className="count-badge">{data.total_articles}</span>
            </div>
            
            <div className="branch-content">
              {data.articles?.map((article, index) => (
                <div 
                  key={article.id} 
                  className="resource-card article-card"
                  data-link={article.link}
                  onClick={handleCardClickEvent}
                >
                  <div className="resource-header">
                    <div className="resource-number">{article.id}</div>
                    <div className="resource-title">{article.title}</div>
                    {renderScore(article.similarity_score)}
                  </div>
                  
                  <div className="resource-details">
                    <div className="resource-source">
                      <span className="source-label">Source:</span>
                      <span className="source-value">{article.source}</span>
                    </div>
                    
                    {article.labels?.length > 0 && (
                      <div className="resource-tags">
                        {article.labels.slice(0, 3).map((label, idx) => (
                          <span key={idx} className="tag">{label}</span>
                        ))}
                      </div>
                    )}
                    
                    {renderLink(article)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Videos Branch */}
          <div className="branch videos-branch">
            <div className="branch-header">
              <Play size={20} />
              <h3>Video Tutorials</h3>
              <span className="count-badge">{data.total_videos}</span>
            </div>
            
            <div className="branch-content">
              {data.videos?.map((video, index) => {
                const thumbnailUrl = getYouTubeThumbnail(video.link);
                return (
                  <div 
                    key={video.id} 
                    className="resource-card video-card"
                    data-link={video.link}
                    onClick={handleCardClickEvent}
                  >
                    {thumbnailUrl && (
                      <div className="video-thumbnail">
                        <img 
                          src={thumbnailUrl} 
                          alt={video.title}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="play-overlay">
                          <Play size={32} />
                        </div>
                      </div>
                    )}
                    <div className="resource-header">
                      <div className="resource-number">{video.id}</div>
                      <div className="resource-title">{video.title}</div>
                      {renderScore(video.similarity_score)}
                    </div>
                    
                    <div className="resource-details">
                      <div className="resource-source">
                        <span className="source-label">Source:</span>
                        <span className="source-value">{video.source}</span>
                      </div>
                      
                      {video.labels?.length > 0 && (
                        <div className="resource-tags">
                          {video.labels.slice(0, 3).map((label, idx) => (
                            <span key={idx} className="tag">{label}</span>
                          ))}
                        </div>
                      )}
                      
                      {renderLink(video)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FishboneRoadmap;

