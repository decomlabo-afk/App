const payBtn = document.getElementById('pay');
const errorEl = document.getElementById('error');
const counterEl = document.getElementById('counter');

function showError(text) {
  errorEl.textContent = text;
  errorEl.hidden = false;
}

payBtn.addEventListener('click', async () => {
  errorEl.hidden = true;
  payBtn.disabled = true;
  payBtn.classList.add('loading');
  try {
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Something went wrong');
    // Page de paiement Stripe : Apple Pay / Google Pay apparaissent automatiquement
    // sur les appareils compatibles, sinon saisie de la carte bancaire.
    window.location.href = data.url;
  } catch (err) {
    showError(err.message);
    payBtn.disabled = false;
    payBtn.classList.remove('loading');
  }
});

// Si on revient de Stripe avec "retour", réactive le bouton (cache du navigateur).
window.addEventListener('pageshow', () => {
  payBtn.disabled = false;
  payBtn.classList.remove('loading');
});

(async () => {
  try {
    const { count } = await (await fetch('/api/count')).json();
    if (count > 0) {
      counterEl.textContent = `${count.toLocaleString('en-US')} ${count > 1 ? 'people are' : 'person is'} already certain.`;
      counterEl.hidden = false;
    }
  } catch { /* compteur facultatif */ }
})();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
