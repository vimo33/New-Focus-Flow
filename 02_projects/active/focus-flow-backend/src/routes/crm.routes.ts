import { Router, Request, Response } from 'express';
import { crmService } from '../services/crm.service';

const router = Router();

// GET /api/crm/contacts
router.get('/crm/contacts', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const contacts = await crmService.getContacts(search);
    res.json({ contacts, count: contacts.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crm/contacts/:id
router.get('/crm/contacts/:id', async (req: Request, res: Response) => {
  try {
    const contact = await crmService.getContact(String(req.params.id));
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    const interactions = await crmService.getInteractions(contact.id);
    res.json({ ...contact, interactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/crm/contacts
router.post('/crm/contacts', async (req: Request, res: Response) => {
  try {
    const contact = await crmService.createContact(req.body);
    res.status(201).json({ status: 'created', contact });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/crm/contacts/:id
router.put('/crm/contacts/:id', async (req: Request, res: Response) => {
  try {
    const contact = await crmService.updateContact(String(req.params.id), req.body);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json({ status: 'updated', contact });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/crm/interactions
router.post('/crm/interactions', async (req: Request, res: Response) => {
  try {
    const interaction = await crmService.addInteraction(req.body);
    res.status(201).json({ status: 'created', interaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crm/interactions
router.get('/crm/interactions', async (req: Request, res: Response) => {
  try {
    const contactId = req.query.contact_id as string | undefined;
    const interactions = await crmService.getInteractions(contactId);
    res.json({ interactions, count: interactions.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
