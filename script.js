
  // Snowfall
  (function snowInit(){
    const snow = document.getElementById('snow');
    const N = 60;
    for (let i = 0; i < N; i++) {
      const f = document.createElement('div');
      f.className = 'flake';
      const size = 1 + Math.random() * 3;
      f.style.width = f.style.height = size + 'px';
      f.style.left = (Math.random() * 100) + 'vw';
      f.style.opacity = (0.3 + Math.random() * 0.5);
      f.style.animationDuration = (8 + Math.random() * 14) + 's';
      f.style.animationDelay = (-Math.random() * 18) + 's';
      f.style.filter = 'blur(' + (Math.random() * 1.2) + 'px)';
      snow.appendChild(f);
    }
  })();

  // Nav scroll state
  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  });

  // Email signup
  const SUBSCRIBE_URL = 'https://6a0d050f0009f1272cb1.sfo.appwrite.run/';

  async function handleSignup(e, src) {
    if (e) e.preventDefault();
    const isCta = src === 'cta';
    const input = document.getElementById(isCta ? 'cta-email' : 'nl-email');
    const val = input.value.trim();
    if (!val || !val.includes('@')) {
      input.style.borderColor = '#8B2418';
      return false;
    }

    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: val }),
      });
      if (!res.ok) throw new Error('subscription failed');
    } catch (err) {
      console.error(err);
    }

    if (isCta) {
      const wrap = input.closest('.cta-strip-inner');
      wrap.innerHTML = '<div class="signup-success on" style="max-width:520px;margin:0 auto"><strong>You\'re on the list.</strong>Look for your free copy of <em>When Justice Calls</em> in your inbox &mdash; and a release-day alert when <em>Stray Evidence</em> drops.</div>';
    } else {
      document.getElementById('nl-form').style.display = 'none';
      document.getElementById('nl-success').classList.add('on');
    }
    return false;
  }

  // Initial hero fade-in
  requestAnimationFrame(() => {
    document.querySelectorAll('#hero .fade-up').forEach((el, i) => {
      setTimeout(() => el.classList.add('on'), 100 + i * 200);
    });
  });

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('on');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
