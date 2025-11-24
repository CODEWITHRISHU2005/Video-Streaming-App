import React from 'react';
import { Link } from 'react-router-dom';
import { FaPlay, FaChartLine, FaUsers, FaDollarSign, FaHandshake, FaUpload, FaArrowRight, FaCheck } from 'react-icons/fa';
import { useVideo } from '../context/VideoContext';

function LandingPage() {
  const { videos } = useVideo();
  const featured = (videos || []).slice(0, 8);

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="landing-hero-modern">
        <div className="hero-bg-overlay" />
        <div className="hero-glow-orb orb-1" />
        <div className="hero-glow-orb orb-2" />
        <div className="hero-pattern" />
        
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot" />
            <span>Join 2M+ creators worldwide</span>
          </div>
          
          <h1 className="hero-title">
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <span 
                className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent"
                style={{
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 3s ease infinite',
                }}
              >
                Stream
              </span>
            </span>
            <span className="text-white/30 mx-3 sm:mx-5">•</span>
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <span 
                className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                style={{
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 3s ease infinite 0.5s',
                }}
              >
                Connect
              </span>
            </span>
            <span className="text-white/30 mx-3 sm:mx-5">•</span>
            <span className="inline-block animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <span 
                className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent"
                style={{
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 3s ease infinite 1s',
                }}
              >
                Inspire
              </span>
              <span className="text-white/90">.</span>
            </span>
          </h1>
          
          {/* Decorative underline with animation */}
          <div className="flex justify-center items-center gap-3 mt-6 mb-4">
            <div className="h-1 w-20 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full animate-pulse" />
            <div className="h-1.5 w-32 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 rounded-full shadow-lg shadow-cyan-400/50" />
            <div className="h-1 w-20 bg-gradient-to-r from-transparent via-purple-400 to-transparent rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <style>{`
            @keyframes gradient-shift {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>
          
          <p className="hero-subtitle">
            Discover a world of creativity through immersive, community-powered videos. 
            Build your audience, monetize your passion, and connect with creators globally.
          </p>
          
          <div className="hero-cta-group">
            <Link to="/signup" className="btn-primary">
              <FaUpload />
              <span>Get Started Free</span>
              <FaArrowRight className="arrow-icon" />
            </Link>
            <Link to="/home" className="btn-secondary">
              <FaPlay />
              <span>Explore Content</span>
            </Link>
          </div>
          
          <div className="hero-features">
            <div className="feature-item">
              <FaCheck className="check-icon" />
              <span>No credit card required</span>
            </div>
            <div className="feature-item">
              <FaCheck className="check-icon" />
              <span>Free forever plan</span>
            </div>
            <div className="feature-item">
              <FaCheck className="check-icon" />
              <span>Start in minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">2M+</div>
            <div className="stat-label">Active Creators</div>
            <div className="stat-trend">+45% this month</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">500M+</div>
            <div className="stat-label">Videos Watched</div>
            <div className="stat-trend">+120M this quarter</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">150+</div>
            <div className="stat-label">Countries</div>
            <div className="stat-trend">Global reach</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">99.9%</div>
            <div className="stat-label">Uptime</div>
            <div className="stat-trend">Reliable platform</div>
          </div>
        </div>
      </section>

      {/* Featured Content */}
      <section className="content-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Trending Now</h2>
            <p className="section-subtitle">Discover what's capturing attention worldwide</p>
          </div>
          <Link to="/home" className="section-link">
            View All
            <FaArrowRight />
          </Link>
        </div>
        
        <div className="video-grid">
          {featured.map((v, i) => (
            <Link key={v.id || i} to={`/watch/${v.id || i}`} className="video-card">
              <div className="video-thumbnail-wrapper">
                <img 
                  src={v.thumbnailUrl || v.thumbnail || 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd53?q=80&w=600&auto=format&fit=crop'} 
                  alt={v.title || 'video'} 
                  className="video-thumbnail" 
                />
                <div className="video-overlay">
                  <div className="play-button">
                    <FaPlay />
                  </div>
                </div>
                <div className="video-duration">12:34</div>
                <div className="video-views">{v.views || '1.2K'} views</div>
              </div>
              <div className="video-info">
                <img 
                  className="creator-avatar" 
                  src={v.avatarUrl || `https://i.pravatar.cc/40?img=${(i+3)%50}`} 
                  alt="creator" 
                />
                <div className="video-details">
                  <h3 className="video-title">{v.title || 'Featured Video'}</h3>
                  <p className="video-creator">{v.channelTitle || v.creator || 'Creator Name'}</p>
                  <div className="video-meta">
                    <span>{v.views || '1.2K'} views</span>
                    <span>•</span>
                    <span>2 days ago</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Value Propositions */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Everything You Need to Succeed</h2>
          <p className="section-subtitle">Powerful tools designed for modern creators</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaUsers className="feature-icon" />
            </div>
            <h3 className="feature-title">Build Your Audience</h3>
            <p className="feature-description">
              Grow a passionate community around your content with smart discovery algorithms 
              and engagement tools that help you connect with the right viewers.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaDollarSign className="feature-icon" />
            </div>
            <h3 className="feature-title">Monetize Your Passion</h3>
            <p className="feature-description">
              Earn through memberships, tips, sponsorships, and ad revenue. 
              Multiple monetization streams built specifically for creators.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaHandshake className="feature-icon" />
            </div>
            <h3 className="feature-title">Connect with Creators</h3>
            <p className="feature-description">
              Collaborate and network with creators across genres and regions. 
              Join a vibrant community that supports and elevates each other.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaChartLine className="feature-icon" />
            </div>
            <h3 className="feature-title">Advanced Analytics</h3>
            <p className="feature-description">
              Track your growth with actionable insights across content performance, 
              audience demographics, and engagement metrics.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Start Your Journey?</h2>
          <p className="cta-subtitle">
            Join thousands of creators who are already building their communities on StreamFlow
          </p>
          <Link to="/signup" className="btn-primary btn-large">
            <FaUpload />
            <span>Get Started Free</span>
            <FaArrowRight className="arrow-icon" />
          </Link>
        </div>
      </section>

      {/* Trust Footer */}
      <section className="trust-footer">
        <div className="trust-links">
          <Link to="/safety">Safe Community</Link>
          <span>•</span>
          <Link to="/guidelines">Content Guidelines</Link>
          <span>•</span>
          <Link to="/support">Creator Support</Link>
          <span>•</span>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;

