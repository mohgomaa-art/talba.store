import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * A simple JSON-based database wrapper that mimics Mongoose patterns
 */
class DB {
  constructor(collection) {
    this.filePath = path.join(DATA_DIR, `${collection}.json`);
  }

  async read() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  async write(data) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async find(query = {}) {
    const data = await this.read();
    return data.filter(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  }

  async findOne(query) {
    const results = await this.find(query);
    return results[0] || null;
  }

  async findById(id) {
    return this.findOne({ id });
  }

  async create(item) {
    const data = await this.read();
    const newItem = {
      ...item,
      id: item.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.push(newItem);
    await this.write(data);
    return newItem;
  }

  async findByIdAndUpdate(id, updates) {
    let data = await this.read();
    let updatedItem = null;
    data = data.map(item => {
      if (item.id === id || item.taagerId === id) {
        updatedItem = { ...item, ...updates, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return item;
    });
    await this.write(data);
    return updatedItem;
  }

  async updateOne(query, updates, options = {}) {
    let data = await this.read();
    let index = data.findIndex(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (index !== -1) {
      data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
      await this.write(data);
      return data[index];
    } else if (options.upsert) {
      return this.create({ ...query, ...updates });
    }
    return null;
  }
}

export const Product = new DB('products');
export const Order = new DB('orders');
export const Category = new DB('categories');
export const Settings = new DB('settings');
