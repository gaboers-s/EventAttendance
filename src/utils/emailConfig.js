const KEYS = {
  publicKey: 'emailjs_public_key',
  serviceId: 'emailjs_service_id',
  templateId: 'emailjs_template_id',
  departmentName: 'emailjs_department_name',
};

export function loadEmailConfig() {
  return {
    publicKey: localStorage.getItem(KEYS.publicKey) || '',
    serviceId: localStorage.getItem(KEYS.serviceId) || '',
    templateId: localStorage.getItem(KEYS.templateId) || '',
    departmentName: localStorage.getItem(KEYS.departmentName) || '',
  };
}

export function saveEmailConfig({ publicKey, serviceId, templateId, departmentName = '' }) {
  localStorage.setItem(KEYS.publicKey, publicKey);
  localStorage.setItem(KEYS.serviceId, serviceId);
  localStorage.setItem(KEYS.templateId, templateId);
  localStorage.setItem(KEYS.departmentName, departmentName);
}

export function updateEmailConfig(partial) {
  const current = loadEmailConfig();
  saveEmailConfig({ ...current, ...partial });
}

export function resetEmailConfig() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}