import { useState, useEffect } from 'react'
import logoImg from './assets/hccc-gate.png'
import homeVideo from './assets/Home-video.mov'
import headshotImg from './assets/headshot.png'
import before1 from './assets/before-1.jpeg'
import after1 from './assets/after-1.jpeg'
import before2 from './assets/before 2.jpeg'
import after2 from './assets/after-2.jpeg'
import { submitToGoogleSheets, formatFormData, validateFormData } from './utils/formSubmission'
import { performanceMonitor, optimizeImages, preloadCriticalResources } from './utils/performance.js'
import './App.css'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="nav">
      <div className="container">
        <div className="brand">
          <img src={logoImg} alt="Holy City Clean Co. logo" className="brand-logo" />
          <span className="brand-title">Holy City Clean Co.</span>
        </div>
        <button
          className={`menu-button${isMenuOpen ? ' open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((v) => !v)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="nav-actions">
          <nav>
            <a href="#home" onClick={() => setIsMenuOpen(false)}>Home</a>
            <a href="#services" onClick={() => setIsMenuOpen(false)}>Services</a>
            <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
          </nav>
          <a href="#quote" className="btn-estimate" onClick={() => setIsMenuOpen(false)}>Free Estimate</a>
        </div>
      </div>
      {isMenuOpen && (
        <div className="mobile-menu">
          <nav>
            <a href="#home" onClick={() => setIsMenuOpen(false)}>Home</a>
            <a href="#services" onClick={() => setIsMenuOpen(false)}>Services</a>
            <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
            <a href="#quote" className="btn-estimate" onClick={() => setIsMenuOpen(false)}>Free Estimate</a>
          </nav>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="social">
            <a href="https://www.facebook.com/profile.php?id=61580455202667" aria-label="Facebook" target="_blank" rel="noreferrer">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 12.06C22 6.58 17.52 2.1 12.04 2.1C6.56 2.1 2.08 6.58 2.08 12.06C2.08 17.02 5.72 21.12 10.44 21.9V14.98H7.9V12.06H10.44V9.91C10.44 7.4 11.93 6.03 14.22 6.03C15.31 6.03 16.46 6.22 16.46 6.22V8.69H15.19C13.94 8.69 13.64 9.46 13.64 10.24V12.06H16.34L15.91 14.98H13.64V21.9C18.36 21.12 22 17.02 22 12.06Z" fill="currentColor"/>
              </svg>
            </a>
            <a href="https://www.instagram.com/holycitycleanco/" aria-label="Instagram" target="_blank" rel="noreferrer">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 2H17C20 2 22 4 22 7V17C22 20 20 22 17 22H7C4 22 2 20 2 17V7C2 4 4 2 7 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.5 7.5H16.51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8.5C9.79 8.5 8 10.29 8 12.5C8 14.71 9.79 16.5 12 16.5C14.21 16.5 16 14.71 16 12.5C16 10.29 14.21 8.5 12 8.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="https://www.tiktok.com/@holycitycleanco?_t=ZP-8zaOVuocq2Z&_r=1" aria-label="TikTok" target="_blank" rel="noreferrer">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 8.5C18.08 8.5 16.42 7.27 15.86 5.56V5H13.25V15.06C13.25 16.49 12.09 17.66 10.66 17.66C9.23 17.66 8.06 16.49 8.06 15.06C8.06 13.63 9.23 12.46 10.66 12.46C11.01 12.46 11.34 12.53 11.64 12.64V10C11.31 9.95 10.98 9.92 10.66 9.92C7.87 9.92 5.62 12.17 5.62 14.96C5.62 17.75 7.87 20 10.66 20C13.45 20 15.7 17.75 15.7 14.96V10.22C16.79 11.15 18.22 11.72 19.77 11.72H20V8.5Z" fill="currentColor"/>
              </svg>
            </a>
          </div>
        </div>
        <p>© {new Date().getFullYear()} Holy City Clean Co. All rights reserved.</p>
      </div>
    </footer>
  )
}

function Page({ id, title, children }) {
  return (
    <section id={id} className="container">
      {title && <h1>{title}</h1>}
      {children}
    </section>
  )
}

function Home() {
  return (
    <Page id="home">
      <div className="home-hero">
        <div className="reviews-column">
          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <p>He made our driveway look brand new. Fast, friendly, and professional!</p>
            <div className="reviewer">— Jordan M.</div>
          </div>
          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <p>House siding is spotless. I didn't realize how bright it could be again.</p>
            <div className="reviewer">— Alexis R.</div>
          </div>
        </div>

        <div className="hero-video-wrap">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            preload="metadata"
            poster={logoImg}
          >
            {/* Prefer widely-supported MP4 if available in /public */}
            <source src="/Home-video.mp4" type="video/mp4" />
            <source src={homeVideo} type="video/quicktime" />
            Your browser does not support the video tag.
          </video>
          {/* Fallback link in case neither source plays */}
          <noscript>
            <p>
              Video preview requires JavaScript. You can
              <a href="/Home-video.mp4"> download the video</a> instead.
            </p>
          </noscript>
          <a className="phone-badge" href="tel:18436096932" aria-label="Call Holy City Clean Co. for a free estimate">
            <span className="phone-badge-ring" aria-hidden="true"></span>
            <span className="phone-badge-text">
              <span className="phone-badge-text-label">Call for a Free Estimate</span>
              <span className="phone-badge-text-number">(843) 609-6932</span>
            </span>
          </a>
        </div>

        <div className="reviews-column">
          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <p>Patio and walkways look incredible. He was careful with all our plants.</p>
            <div className="reviewer">— Priya S.</div>
          </div>
          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <p>Years of grime gone in an afternoon. Worth every penny.</p>
            <div className="reviewer">— Evan K.</div>
          </div>
        </div>
      </div>
    </Page>
  )
}

function Services() {
  return (
    <Page id="services" title="Our Services">
      <div className="services-columns">
        <div className="services-col">
          <div className="service-card">
            <h3>Pressure Washing – Driveways & Walkways</h3>
            <p>
              Driveways and walkways are high-traffic areas that quickly collect oil stains, dirt, and grime. With
              our professional pressure washing, we restore concrete, brick, and stone surfaces to their original
              brightness. Our high-powered equipment blasts away years of buildup, improving curb appeal and
              creating a clean, welcoming path to your home.
            </p>
            <BeforeAfterGallery />
          </div>
        </div>
        <div className="services-col">
          <div className="service-card">
            <h3>Soft Washing – Home Exterior</h3>
            <p>
              Your home's siding, roof, and exterior surfaces deserve a gentle touch. Our soft washing service
              uses low-pressure water combined with eco-friendly cleaning solutions to safely remove dirt,
              mildew, algae, and stains without damaging paint, shingles, or delicate materials. This method
              not only cleans but also protects your home's exterior, leaving it fresh, spotless, and long-lasting.
            </p>
          </div>
          <div className="service-card">
            <h3>Deck Washing</h3>
            <p>
              Outdoor decks are a great place to relax and entertain, but exposure to the elements can leave them
              looking weathered and worn. Our deck washing service gently yet effectively removes dirt, mildew,
              and discoloration from wood and composite surfaces. By restoring your deck's natural beauty, we
              help extend its life and prepare it for staining or sealing if needed.
            </p>
          </div>
        </div>
      </div>
    </Page>
  )
}

function BeforeAfterGallery() {
  const images = [
    { path: 'before-1.jpeg', src: before1 },
    { path: 'after-1.jpeg', src: after1 },
    { path: 'before 2.jpeg', src: before2 },
    { path: 'after-2.jpeg', src: after2 },
  ]

  return (
    <div className="before-after">
      <div className="before-after-grid">
        {images.map(({ path, src }) => (
          <div key={path} className="ba-item">
            <img src={src} alt={path} />
          </div>
        ))}
      </div>
    </div>
  )
}

function About() {
  return (
    <Page id="about" title="About Me">
      <div className="about-full">
        <div className="about-card">
          <img className="about-photo" src={headshotImg} alt="Owner headshot" />
          <div className="about-content">
            <p>
              My name is Reid, and I’m the owner of Holy City Clean Co. I’m committed to delivering
              meticulous, reliable exterior cleaning for homes and businesses. From soft washing siding to
              restoring driveways, I treat every property with the same care I would my own.
            </p>
            <p>
              As a lifelong Charlestonian and graduate of Charleston Southern University, I take great pride in
              serving our community with dependable, cost‑effective, and high‑quality service.
            </p>
            <p>
              Safety, communication, and results matter most—so I use proven methods and eco‑friendly
              detergents to ensure a thorough, long‑lasting clean. I’d appreciate the opportunity to earn your
              trust and make your place look its best.
            </p>
          </div>
        </div>
      </div>
    </Page>
  )
}


function Quote() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // 'success', 'error', or null
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const clearFieldError = (fieldName) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)
    setErrorMessage('')
    setFieldErrors({})

    try {
      // Format and validate form data
      const formData = formatFormData(e.target)
      const validationErrors = validateFormData(formData)
      
      if (validationErrors.length > 0) {
        // Create field-specific error highlighting
        const newFieldErrors = {}
        validationErrors.forEach(error => {
          const lower = error.toLowerCase()
          if (lower.includes('first name')) newFieldErrors.firstName = true
          if (lower.includes('last name')) newFieldErrors.lastName = true
          if (lower.includes('email')) newFieldErrors.email = true
          if (lower.includes('phone')) newFieldErrors.phone = true
          if (lower.includes('address')) newFieldErrors.address = true
          if (lower.includes('referrer')) newFieldErrors.referrer = true
          if (lower.includes('service')) newFieldErrors.service = true
          if (lower.includes('other services')) newFieldErrors.otherDetails = true
        })
        
        setFieldErrors(newFieldErrors)
        setErrorMessage(validationErrors.join(', '))
        setSubmitStatus('error')
        setIsSubmitting(false)
        return
      }

      // Submit to Google Sheets
      const result = await submitToGoogleSheets(formData)
      
      if (result.success) {
        setSubmitStatus('success')
        setFieldErrors({})
        e.target.reset() // Clear the form
      } else {
        throw new Error(result.message || 'Submission failed')
      }
      
    } catch (error) {
      console.error('Form submission error:', error)
      setErrorMessage(error.message || 'Failed to submit form. Please try again.')
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page id="quote" title="Get A Free Estimate">
      <form className="contact-form quote-form" onSubmit={handleSubmit}>
        <p className="quote-intro">Tell us a bit about your project and we'll get back to you quickly with a tailored estimate.</p>

        <h3>Contact Information <span className="required-note">* All fields required</span></h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="q-first-name" className={fieldErrors.firstName ? 'error-label' : ''}>First Name *</label>
            <input 
              id="q-first-name" 
              name="firstName" 
              type="text" 
              placeholder="First name" 
              required 
              className={fieldErrors.firstName ? 'error-input' : ''}
              onChange={() => clearFieldError('firstName')}
            />
            {fieldErrors.firstName && <span className="field-error">First name is required</span>}
          </div>
          <div className="form-group">
            <label htmlFor="q-last-name" className={fieldErrors.lastName ? 'error-label' : ''}>Last Name *</label>
            <input 
              id="q-last-name" 
              name="lastName" 
              type="text" 
              placeholder="Last name" 
              required 
              className={fieldErrors.lastName ? 'error-input' : ''}
              onChange={() => clearFieldError('lastName')}
            />
            {fieldErrors.lastName && <span className="field-error">Last name is required</span>}
          </div>
          <div className="form-group">
            <label htmlFor="q-phone" className={fieldErrors.phone ? 'error-label' : ''}>Phone *</label>
            <input 
              id="q-phone" 
              name="phone" 
              type="tel" 
              placeholder="(555) 123-4567" 
              required 
              className={fieldErrors.phone ? 'error-input' : ''}
              onChange={() => clearFieldError('phone')}
            />
            {fieldErrors.phone && <span className="field-error">Phone number is required</span>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="q-street" className={fieldErrors.streetAddress ? 'error-label' : ''}>Street *</label>
            <input 
              id="q-street" 
              name="streetAddress" 
              type="text" 
              placeholder="Street" 
              required 
              className={fieldErrors.streetAddress ? 'error-input' : ''}
              onChange={() => clearFieldError('streetAddress')}
            />
            {fieldErrors.streetAddress && <span className="field-error">Street address is required</span>}
          </div>
          <div className="form-group">
            <label htmlFor="q-city" className={fieldErrors.city ? 'error-label' : ''}>City *</label>
            <input 
              id="q-city" 
              name="city" 
              type="text" 
              placeholder="City" 
              required 
              className={fieldErrors.city ? 'error-input' : ''}
              onChange={() => clearFieldError('city')}
            />
            {fieldErrors.city && <span className="field-error">City is required</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="q-state" className={fieldErrors.state ? 'error-label' : ''}>State *</label>
            <select
              id="q-state"
              name="state"
              required
              className={fieldErrors.state ? 'error-input' : ''}
              onChange={() => clearFieldError('state')}
              defaultValue=""
            >
              <option value="" disabled>Select state</option>
              <option value="AL">AL</option>
              <option value="AK">AK</option>
              <option value="AZ">AZ</option>
              <option value="AR">AR</option>
              <option value="CA">CA</option>
              <option value="CO">CO</option>
              <option value="CT">CT</option>
              <option value="DE">DE</option>
              <option value="DC">DC</option>
              <option value="FL">FL</option>
              <option value="GA">GA</option>
              <option value="HI">HI</option>
              <option value="ID">ID</option>
              <option value="IL">IL</option>
              <option value="IN">IN</option>
              <option value="IA">IA</option>
              <option value="KS">KS</option>
              <option value="KY">KY</option>
              <option value="LA">LA</option>
              <option value="ME">ME</option>
              <option value="MD">MD</option>
              <option value="MA">MA</option>
              <option value="MI">MI</option>
              <option value="MN">MN</option>
              <option value="MS">MS</option>
              <option value="MO">MO</option>
              <option value="MT">MT</option>
              <option value="NE">NE</option>
              <option value="NV">NV</option>
              <option value="NH">NH</option>
              <option value="NJ">NJ</option>
              <option value="NM">NM</option>
              <option value="NY">NY</option>
              <option value="NC">NC</option>
              <option value="ND">ND</option>
              <option value="OH">OH</option>
              <option value="OK">OK</option>
              <option value="OR">OR</option>
              <option value="PA">PA</option>
              <option value="RI">RI</option>
              <option value="SC">SC</option>
              <option value="SD">SD</option>
              <option value="TN">TN</option>
              <option value="TX">TX</option>
              <option value="UT">UT</option>
              <option value="VT">VT</option>
              <option value="VA">VA</option>
              <option value="WA">WA</option>
              <option value="WV">WV</option>
              <option value="WI">WI</option>
              <option value="WY">WY</option>
            </select>
            {fieldErrors.state && <span className="field-error">State is required</span>}
          </div>
          <div className="form-group">
            <label htmlFor="q-zip" className={fieldErrors.zip ? 'error-label' : ''}>ZIP Code *</label>
            <input 
              id="q-zip" 
              name="zip" 
              type="text" 
              placeholder="29401" 
              required 
              className={fieldErrors.zip ? 'error-input' : ''}
              onChange={() => clearFieldError('zip')}
            />
            {fieldErrors.zip && <span className="field-error">ZIP code is required</span>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="q-email" className={fieldErrors.email ? 'error-label' : ''}>Email *</label>
            <input 
              id="q-email" 
              name="email" 
              type="email" 
              placeholder="you@example.com" 
              required 
              className={fieldErrors.email ? 'error-input' : ''}
              onChange={() => clearFieldError('email')}
            />
            {fieldErrors.email && <span className="field-error">Valid email is required</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="q-referrer" className={fieldErrors.referrer ? 'error-label' : ''}>How did you hear about us? *</label>
          <select
            id="q-referrer"
            name="referrer"
            required
            className={fieldErrors.referrer ? 'error-input' : ''}
            onChange={() => clearFieldError('referrer')}
            defaultValue=""
          >
            <option value="" disabled>Select an option</option>
            <option value="Google Search">Google Search</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="Word of Mouth">Word of Mouth</option>
            <option value="Yard Sign">Yard Sign</option>
            <option value="Flyer">Flyer</option>
            <option value="Previous Customer">Previous Customer</option>
            <option value="Other">Other</option>
          </select>
          {fieldErrors.referrer && <span className="field-error">Please tell us how you heard about us</span>}
        </div>

        <h3>Type of Service You are Seeking:</h3>
        <div className={`quote-options ${fieldErrors.service ? 'error-section' : ''}`}>
          <label className="checkbox">
            <input type="checkbox" name="service" value="exterior" onChange={() => clearFieldError('service')} /> Home/Business Exterior
          </label>
          <label className="checkbox">
            <input type="checkbox" name="service" value="concrete" onChange={() => clearFieldError('service')} /> Concrete Pressure Washing
          </label>
          <label className="checkbox">
            <input type="checkbox" name="service" value="deck" onChange={() => clearFieldError('service')} /> Deck/Fence Cleaning
          </label>
          <label className="checkbox">
            <input type="checkbox" name="service" value="other" onChange={() => clearFieldError('service')} /> Other
          </label>
        </div>
        {fieldErrors.service && <span className="field-error">Please select at least one service type</span>}

        <div className="form-group">
          <label htmlFor="q-other" className={fieldErrors.otherDetails ? 'error-label' : ''}>If Other, please describe <span className="conditional-note">(required if Other is selected)</span></label>
          <textarea 
            id="q-other" 
            name="otherDetails" 
            rows={3} 
            placeholder="Describe other services you're looking for"
            className={fieldErrors.otherDetails ? 'error-input' : ''}
            onChange={() => clearFieldError('otherDetails')}
          ></textarea>
          {fieldErrors.otherDetails && <span className="field-error">Please describe the other services you are looking for</span>}
        </div>

        <div className="form-group">
          <label htmlFor="q-notes">Comments / Notes</label>
          <textarea id="q-notes" name="notes" rows={4} placeholder="Describe your project, preferred timing, etc."></textarea>
        </div>

        <div className="submit-container">
          <button 
            type="submit" 
            className="btn-primary btn-submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          
          {/* Simple success message next to submit button */}
          {submitStatus === 'success' && (
            <span className="success-message">Successfully Submitted</span>
          )}
          
          {/* Error message for submission errors */}
          {submitStatus === 'error' && (
            <span className="error-message">{errorMessage}</span>
          )}
        </div>
      </form>
    </Page>
  )
}

export default function App() {
  useEffect(() => {
    // Start performance monitoring
    performanceMonitor.start();
    
    // Optimize images
    optimizeImages();
    
    // Preload critical resources
    preloadCriticalResources();
    
    // Log performance report after 5 seconds
    const timer = setTimeout(() => {
      performanceMonitor.logReport();
    }, 5000);
    
    return () => {
      clearTimeout(timer);
      performanceMonitor.stop();
    };
  }, []);

  return (
    <>
      <Navbar />
      <Home />
      <Services />
      <About />
      <Quote />
      <Footer />
    </>
  )
}

