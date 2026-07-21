/**
 * Oil Amor — Enterprise Grade Interactions
 * Bug-fixed, production-ready
 */

(function() {
  'use strict';

  // ========================================
  // Device Detection
  // ========================================
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 
                  'ontouchstart' in window || 
                  navigator.maxTouchPoints > 0;
  
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ========================================
  // Oil Amor Application
  // ========================================
  class OilAmorApp {
    constructor() {
      this.cart = [];
      this.scroll = null;
      this.cursor = {
        dot: document.querySelector('.cursor-dot'),
        circle: document.querySelector('.cursor-circle'),
        text: document.querySelector('.cursor-text'),
        wrapper: document.querySelector('.cursor')
      };
      this.mouse = { x: 0, y: 0 };
      this.cursorPos = { x: 0, y: 0 };
      this.rafId = null;
      this.isCartOpen = false;
      
      this.init();
    }

    init() {
      // Initialize in order
      this.initPreloader();
      
      if (!isTouch) {
        this.initCursor();
        this.initMagneticButtons();
      }
      
      this.initSmoothScroll();
      this.initNavigation();
      this.initCart();
      this.initScrollAnimations();
      this.initCounters();
      this.initAtelierScroll();
      this.initMobileMenu();
      this.initNewsletterForm();
      
      console.log('%c🜂 Oil Amor', 'font-size: 24px; font-weight: 300; color: #c9a227; font-family: Cormorant Garamond, serif;');
      console.log('%cEssential oils that transcend consumption.', 'font-size: 12px; color: #666; font-style: italic;');
    }

    // ========================================
    // Preloader
    // ========================================
    initPreloader() {
      const preloader = document.querySelector('.preloader');
      if (!preloader) return;
      
      const hidePreloader = () => {
        preloader.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Remove from DOM after transition
        setTimeout(() => {
          if (preloader.parentNode) {
            preloader.parentNode.removeChild(preloader);
          }
        }, 1000);
      };
      
      // Wait for load + minimum display time
      let loaded = false;
      let minTimeElapsed = false;
      
      const checkHide = () => {
        if (loaded && minTimeElapsed) {
          hidePreloader();
        }
      };
      
      window.addEventListener('load', () => {
        loaded = true;
        checkHide();
      });
      
      setTimeout(() => {
        minTimeElapsed = true;
        checkHide();
      }, 2500);
      
      document.body.style.overflow = 'hidden';
    }

    // ========================================
    // Custom Cursor
    // ========================================
    initCursor() {
      if (!this.cursor.wrapper) return;
      
      let isActive = false;
      let mouseX = 0;
      let mouseY = 0;
      
      const updateCursor = () => {
        // Smooth follow with different easing for dot vs circle
        this.cursorPos.x += (mouseX - this.cursorPos.x) * 0.12;
        this.cursorPos.y += (mouseY - this.cursorPos.y) * 0.12;
        
        if (this.cursor.dot) {
          this.cursor.dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        }
        if (this.cursor.circle) {
          this.cursor.circle.style.transform = `translate(${this.cursorPos.x}px, ${this.cursorPos.y}px) translate(-50%, -50%)`;
        }
        if (this.cursor.text) {
          this.cursor.text.style.transform = `translate(${this.cursorPos.x}px, ${this.cursorPos.y}px) translate(-50%, -50%)`;
        }
        
        if (isActive) {
          this.rafId = requestAnimationFrame(updateCursor);
        }
      };
      
      document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        if (!isActive) {
          isActive = true;
          updateCursor();
        }
      }, { passive: true });
      
      document.addEventListener('mouseleave', () => {
        isActive = false;
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      });
      
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
          isActive = false;
        }
      });

      // Cursor states
      const interactiveElements = document.querySelectorAll('a, button, [data-cursor]');
      
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
          const cursorType = el.dataset.cursor;
          this.cursor.wrapper.classList.add('hover');
          
          if (cursorType) {
            this.cursor.wrapper.classList.add(cursorType);
            if ((cursorType === 'view' || cursorType === 'add' || cursorType === 'external') && this.cursor.text) {
              this.cursor.text.style.opacity = '1';
            }
          }
        });
        
        el.addEventListener('mouseleave', () => {
          this.cursor.wrapper.className = 'cursor';
          if (this.cursor.text) {
            this.cursor.text.style.opacity = '0';
          }
        });
      });
    }

    // ========================================
    // Magnetic Buttons
    // ========================================
    initMagneticButtons() {
      const magneticElements = document.querySelectorAll('.magnetic');
      
      magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          
          // Limit the magnetic pull
          const limit = 15;
          const clampedX = Math.max(-limit, Math.min(limit, x * 0.3));
          const clampedY = Math.max(-limit, Math.min(limit, y * 0.3));
          
          el.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
        });
        
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'translate(0, 0)';
        });
      });
    }

    // ========================================
    // Smooth Scroll (Locomotive)
    // ========================================
    initSmoothScroll() {
      if (isTouch || isReducedMotion || typeof LocomotiveScroll === 'undefined') {
        // Fallback to native smooth scroll
        document.documentElement.style.scrollBehavior = 'smooth';
        return;
      }
      
      try {
        this.scroll = new LocomotiveScroll({
          el: document.querySelector('[data-scroll-container]'),
          smooth: true,
          lerp: 0.08,
          multiplier: 0.8,
          tablet: { smooth: true },
          smartphone: { smooth: false }
        });
        
        // Update on resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            if (this.scroll) this.scroll.update();
          }, 200);
        });
        
        // Optional: velocity-based skew (disabled by default for performance)
        if (!isReducedMotion) {
          this.initScrollSkew();
        }
      } catch (e) {
        console.warn('Locomotive Scroll failed to initialize:', e);
        document.documentElement.style.scrollBehavior = 'smooth';
      }
    }

    initScrollSkew() {
      if (!this.scroll) return;
      
      let currentSkew = 0;
      let targetSkew = 0;
      let lastScrollY = 0;
      let ticking = false;
      
      this.scroll.on('scroll', (args) => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const velocity = args.scroll.y - lastScrollY;
            targetSkew = velocity * 0.002;
            targetSkew = Math.max(-2, Math.min(2, targetSkew));
            lastScrollY = args.scroll.y;
            ticking = false;
          });
          ticking = true;
        }
      });
      
      const updateSkew = () => {
        currentSkew += (targetSkew - currentSkew) * 0.1;
        targetSkew *= 0.95;
        
        if (Math.abs(currentSkew) > 0.01) {
          document.querySelectorAll('.atelier-product, .philosophy-card').forEach(el => {
            // Preserve existing transform
            const existing = el.style.transform;
            if (!existing.includes('translateY') && !existing.includes('scale')) {
              el.style.transform = `skewY(${currentSkew}deg)`;
            }
          });
        }
        
        requestAnimationFrame(updateSkew);
      };
      
      updateSkew();
    }

    // ========================================
    // Navigation
    // ========================================
    initNavigation() {
      const nav = document.querySelector('.nav');
      if (!nav) return;
      
      let lastScroll = 0;
      let ticking = false;
      
      const updateNav = () => {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        if (currentScroll > 100) {
          nav.classList.add('scrolled');
        } else {
          nav.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
        ticking = false;
      };
      
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(updateNav);
          ticking = true;
        }
      }, { passive: true });
      
      // Smooth scroll for anchor links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const href = anchor.getAttribute('href');
          if (href === '#') return;
          
          e.preventDefault();
          const target = document.querySelector(href);
          
          if (target) {
            if (this.scroll) {
              this.scroll.scrollTo(target);
            } else {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          }
        });
      });
    }

    // ========================================
    // Mobile Menu
    // ========================================
    initMobileMenu() {
      const toggle = document.querySelector('.menu-toggle');
      const menu = document.querySelector('.mobile-menu');
      
      if (!toggle || !menu) return;
      
      const toggleMenu = () => {
        const isActive = toggle.classList.toggle('active');
        menu.classList.toggle('active');
        toggle.setAttribute('aria-expanded', isActive);
        document.body.style.overflow = isActive ? 'hidden' : '';
      };
      
      toggle.addEventListener('click', toggleMenu);
      
      // Close on link click
      menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          toggle.classList.remove('active');
          menu.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });
      
      // Close on escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('active')) {
          toggleMenu();
        }
      });
    }

    // ========================================
    // Cart Functionality
    // ========================================
    initCart() {
      const cartTrigger = document.querySelector('.cart-trigger');
      const cartSidebar = document.querySelector('.cart-sidebar');
      const cartBackdrop = document.querySelector('.cart-backdrop');
      const cartClose = document.querySelector('.cart-close');
      
      if (!cartTrigger || !cartSidebar || !cartBackdrop) return;
      
      const openCart = () => {
        this.isCartOpen = true;
        cartSidebar.classList.add('open');
        cartBackdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
        cartSidebar.setAttribute('aria-hidden', 'false');
      };
      
      const closeCart = () => {
        this.isCartOpen = false;
        cartSidebar.classList.remove('open');
        cartBackdrop.classList.remove('open');
        document.body.style.overflow = '';
        cartSidebar.setAttribute('aria-hidden', 'true');
      };
      
      cartTrigger.addEventListener('click', openCart);
      cartClose.addEventListener('click', closeCart);
      cartBackdrop.addEventListener('click', closeCart);
      
      // Add to cart
      document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const product = btn.closest('.atelier-product');
          if (!product) return;
          
          const nameEl = product.querySelector('.product-name');
          const commonEl = product.querySelector('.product-common');
          const priceEl = product.querySelector('.price');
          const crystalEl = product.querySelector('.pairing-crystal');
          
          const name = nameEl ? nameEl.textContent : 'Unknown';
          const common = commonEl ? commonEl.textContent : '';
          const priceText = priceEl ? priceEl.textContent : '$0';
          const price = parseFloat(priceText.replace('$', '')) || 0;
          const crystal = crystalEl ? crystalEl.textContent : '';
          
          const item = {
            id: Date.now(),
            name,
            common,
            price,
            crystal,
            quantity: 1
          };
          
          const existing = this.cart.find(i => i.name === name);
          if (existing) {
            existing.quantity++;
          } else {
            this.cart.push(item);
          }
          
          this.updateCartUI();
          
          // Visual feedback
          const originalText = btn.textContent;
          btn.textContent = 'Added';
          btn.style.background = 'var(--gold-pure)';
          btn.style.color = 'var(--miron-void)';
          btn.style.borderColor = 'var(--gold-pure)';
          
          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
          }, 1500);
          
          openCart();
        });
      });
      
      // Keyboard shortcut
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isCartOpen) {
          closeCart();
        }
      });
    }

    updateCartUI() {
      const cartItems = document.querySelector('.cart-items');
      const cartBadge = document.querySelector('.cart-badge');
      const totalAmount = document.querySelector('.total-amount');
      
      if (!cartItems || !cartBadge || !totalAmount) return;
      
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
      cartBadge.textContent = totalItems;
      cartBadge.setAttribute('aria-label', `${totalItems} items in cart`);
      
      if (this.cart.length === 0) {
        cartItems.innerHTML = `
          <div class="cart-empty">
            <span class="empty-icon" aria-hidden="true">◈</span>
            <p>Your vessel awaits</p>
          </div>
        `;
        totalAmount.textContent = '$0';
      } else {
        cartItems.innerHTML = this.cart.map(item => `
          <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-info">
              <h4>${this.escapeHtml(item.name)}</h4>
              <p class="cart-item-common">${this.escapeHtml(item.common)}</p>
              <p class="cart-item-crystal">${this.escapeHtml(item.crystal)}</p>
              <p class="cart-item-price">$${item.price} × ${item.quantity}</p>
            </div>
            <button type="button" class="cart-item-remove" data-id="${item.id}" aria-label="Remove item">×</button>
          </div>
        `).join('');
        
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalAmount.textContent = '$' + total.toFixed(2);
        
        // Add remove functionality
        cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            this.cart = this.cart.filter(item => item.id !== id);
            this.updateCartUI();
          });
        });
      }
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // ========================================
    // Scroll Animations
    // ========================================
    initScrollAnimations() {
      const animatedElements = document.querySelectorAll(
        '.philosophy-card, .journey-step, .pillar, .stat-item, .membership-content'
      );
      
      if (!animatedElements.length) return;
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.15,
        rootMargin: '0px 0px -10% 0px'
      });
      
      animatedElements.forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
      });
    }

    // ========================================
    // Counter Animations
    // ========================================
    initCounters() {
      const counters = document.querySelectorAll('.stat-value[data-count]');
      
      if (!counters.length) return;
      
      const animatedCounters = new Set();
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !animatedCounters.has(entry.target)) {
            animatedCounters.add(entry.target);
            const target = parseInt(entry.target.dataset.count);
            if (!isNaN(target)) {
              this.animateCounter(entry.target, target);
            }
          }
        });
      }, { threshold: 0.5 });
      
      counters.forEach(counter => observer.observe(counter));
    }

    animateCounter(element, target) {
      const duration = 2000;
      const startTime = performance.now();
      const startValue = 0;
      
      const update = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out quart
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(startValue + (target - startValue) * easeOut);
        
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          // Add suffix if needed
          const label = element.nextElementSibling;
          if (label) {
            const labelText = label.textContent.toLowerCase();
            if (labelText.includes('kg')) {
              element.textContent = current + 'kg';
            } else if (labelText.includes('percent')) {
              element.textContent = current + '%';
            }
          }
        }
      };
      
      requestAnimationFrame(update);
    }

    // ========================================
    // Atelier Horizontal Scroll
    // ========================================
    initAtelierScroll() {
      const gallery = document.querySelector('.atelier-gallery');
      if (!gallery) return;
      
      // Touch/drag to scroll
      if (!isTouch) {
        let isDown = false;
        let startX;
        let scrollLeft;
        
        gallery.addEventListener('mousedown', (e) => {
          isDown = true;
          gallery.style.cursor = 'grabbing';
          startX = e.pageX - gallery.offsetLeft;
          scrollLeft = gallery.scrollLeft;
        });
        
        gallery.addEventListener('mouseleave', () => {
          isDown = false;
          gallery.style.cursor = 'grab';
        });
        
        gallery.addEventListener('mouseup', () => {
          isDown = false;
          gallery.style.cursor = 'grab';
        });
        
        gallery.addEventListener('mousemove', (e) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - gallery.offsetLeft;
          const walk = (x - startX) * 2;
          gallery.scrollLeft = scrollLeft - walk;
        });
        
        gallery.style.cursor = 'grab';
        
        // Wheel horizontal scroll
        gallery.addEventListener('wheel', (e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            gallery.scrollLeft += e.deltaY;
          }
        }, { passive: false });
      }
    }

    // ========================================
    // Newsletter Form
    // ========================================
    initNewsletterForm() {
      const form = document.querySelector('.membership-form');
      if (!form) return;
      
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('.submit-btn');
        const input = form.querySelector('input[type="email"]');
        
        if (!btn || !input) return;
        
        const email = input.value.trim();
        if (!email) return;
        
        const originalHTML = btn.innerHTML;
        
        btn.innerHTML = `
          <span>Welcome</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        `;
        btn.style.background = '#2d5a3d';
        
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.background = '';
          input.value = '';
        }, 2000);
      });
    }
  }

  // ========================================
  // Initialize when DOM is ready
  // ========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new OilAmorApp());
  } else {
    new OilAmorApp();
  }

})();
