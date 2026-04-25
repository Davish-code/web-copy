// ===== YUMEI Bakery — Add-ons Modal Module =====

const Addons = {
  _product: null,
  _basePrice: 0,
  _selections: {}, // { groupIndex: [{ name, price }] }

  open(productId) {
    const product = Products.getProductById(productId);
    if (!product) return;

    this._product = product;
    this._selections = {};

    // Compute base price (inclusive of GST, with any discount applied)
    let base = Utils.getInclusivePrice(product.price, product.gst);
    if (Config.data.discountEnabled && Config.data.discountPercentage > 0) {
      base = Math.round(base - base * (Config.data.discountPercentage / 100));
    }
    this._basePrice = base;

    // Render product header
    document.getElementById('addons-product-header').innerHTML = `
      <h3>${product.name}</h3>
      <p>${product.description || ''}</p>
      <span class="addons-base-price">${Utils.formatCurrency(base)}</span>
    `;

    // Render add-on groups
    const container = document.getElementById('addons-groups-container');
    container.innerHTML = '';
    (product.addons || []).forEach((group, gIdx) => {
      const isMulti = group.maxSelect > 1;
      const optionsHtml = (group.options || []).map((opt, oIdx) => {
        const priceLabel = opt.price > 0 ? `+ ${Utils.formatCurrency(opt.price)}` : 'Free';
        return `
          <div class="addons-option ${isMulti ? 'checkbox-style' : ''}"
               data-group="${gIdx}" data-option="${oIdx}"
               data-price="${opt.price}" data-name="${encodeURIComponent(opt.name)}"
               onclick="Addons._toggleOption(this, ${gIdx}, ${isMulti}, ${group.maxSelect})">
            <div class="addons-option-label">
              <span class="addon-veg-icon"></span>
              ${opt.name}
            </div>
            <span class="addons-option-price">${priceLabel}</span>
            <div class="addons-option-check"></div>
          </div>
        `;
      }).join('');

      const subtitle = isMulti
        ? `Select up to ${group.maxSelect} options`
        : `Select up to 1 option`;

      container.insertAdjacentHTML('beforeend', `
        <div class="addons-group" id="addons-group-${gIdx}">
          <div class="addons-group-header">
            <div class="addons-group-title">${group.name}</div>
            <div class="addons-group-subtitle">${subtitle}</div>
          </div>
          ${optionsHtml}
        </div>
      `);
    });

    // Reset cooking request
    document.getElementById('addons-cooking-input').value = '';
    document.getElementById('addons-cooking-count').textContent = '0';

    // Update total display
    this._updateTotal();

    // Show overlay
    document.getElementById('addons-modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    document.getElementById('addons-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
    this._product = null;
    this._selections = {};
  },

  _toggleOption(el, groupIdx, isMulti, maxSelect) {
    const group = document.getElementById(`addons-group-${groupIdx}`);
    const allOpts = group.querySelectorAll('.addons-option');

    if (isMulti) {
      // Multi-select: toggle this one, respect max
      const currentSelected = group.querySelectorAll('.addons-option.selected').length;
      const isSelected = el.classList.contains('selected');

      if (!isSelected && currentSelected >= maxSelect) {
        Utils.showToast(`You can select up to ${maxSelect} options`, 'info');
        return;
      }
      el.classList.toggle('selected');
    } else {
      // Single-select (radio): deselect all in group then select this
      allOpts.forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
    }

    // Rebuild selections for this group
    this._selections[groupIdx] = [];
    group.querySelectorAll('.addons-option.selected').forEach(opt => {
      this._selections[groupIdx].push({
        name: decodeURIComponent(opt.dataset.name),
        price: parseFloat(opt.dataset.price) || 0
      });
    });

    this._updateTotal();
  },

  _updateTotal() {
    let extra = 0;
    Object.values(this._selections).forEach(opts => {
      opts.forEach(o => { extra += o.price; });
    });
    const total = this._basePrice + extra;
    document.getElementById('addons-total-display').textContent = Utils.formatCurrency(total);
  },

  confirmAdd() {
    if (!this._product) return;

    // Build flat list of selected add-ons across all groups
    const selectedAddons = [];
    (this._product.addons || []).forEach((group, gIdx) => {
      const picks = this._selections[gIdx] || [];
      picks.forEach(pick => {
        selectedAddons.push({ group: group.name, name: pick.name, price: pick.price });
      });
    });

    const cookingRequest = document.getElementById('addons-cooking-input').value.trim();

    // Calculate extra from add-ons
    const addonExtra = selectedAddons.reduce((sum, a) => sum + a.price, 0);

    // Add to cart with add-ons metadata
    Cart.addToCartWithAddons(this._product.id, 1, selectedAddons, addonExtra, cookingRequest);

    this.close();
  },

  init() {
    // Close button
    document.getElementById('addons-modal-close')?.addEventListener('click', () => this.close());

    // Close on overlay backdrop click
    document.getElementById('addons-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('addons-modal-overlay')) this.close();
    });

    // Cooking request character counter
    document.getElementById('addons-cooking-input')?.addEventListener('input', (e) => {
      document.getElementById('addons-cooking-count').textContent = e.target.value.length;
    });
  }
};
