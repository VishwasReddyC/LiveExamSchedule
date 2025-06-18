class MainApp {
    constructor() {
        this.initModals();
    }
    
    initModals() {
        this.modalsContainer = document.getElementById('modals-container');
    }
    
    showModal(title, content, buttons = []) {
        const modalId = 'modal-' + Date.now();
        
        const modalHTML = `
            <div class="modal" id="${modalId}">
                <div class="modal-content">
                    <span class="close-modal" onclick="mainApp.closeModal('${modalId}')">&times;</span>
                    <h3 class="modal-title">${title}</h3>
                    <div class="modal-body">${content}</div>
                    <div class="modal-actions">
                        ${buttons.map(btn => `
                            <button class="modal-btn ${btn.primary ? 'modal-btn-primary' : 'modal-btn-secondary'}" 
                                    onclick="${btn.onClick}">
                                ${btn.text}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        this.modalsContainer.innerHTML += modalHTML;
        document.getElementById(modalId).style.display = 'flex';
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    }
    
    showError(message) {
        this.showModal('Error', message, [
            { text: 'OK', primary: true, onClick: `mainApp.closeModal('modal-' + Date.now())` }
        ]);
    }
    
    showSuccess(message) {
        this.showModal('Success', message, [
            { text: 'OK', primary: true, onClick: `mainApp.closeModal('modal-' + Date.now())` }
        ]);
    }
    
    showConfirmation(message, confirmCallback) {
        const modalId = 'modal-' + Date.now();
        this.showModal('Confirmation', message, [
            { text: 'Cancel', primary: false, onClick: `mainApp.closeModal('${modalId}')` },
            { text: 'Confirm', primary: true, onClick: `${confirmCallback};mainApp.closeModal('${modalId}')` }
        ]);
    }
}

const mainApp = new MainApp();