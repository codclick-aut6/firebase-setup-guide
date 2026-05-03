import { db } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { Category, POPULAR_CATEGORY_ID } from "@/types/menu";

/**
 * Garante que a categoria fixa "Produtos Mais Vendidos" exista no banco.
 * Se não existir, cria com ordem 0 e visível por padrão.
 */
const ensurePopularCategory = async (): Promise<void> => {
  try {
    const popularDocRef = doc(db, "categories", POPULAR_CATEGORY_ID);
    const snap = await getDoc(popularDocRef);
    if (!snap.exists()) {
      await setDoc(popularDocRef, {
        name: "Produtos Mais Vendidos",
        order: 0,
        isPopularCategory: true,
        visible: true,
      });
    }
  } catch (error) {
    console.error("Erro ao garantir categoria de populares:", error);
  }
};

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    await ensurePopularCategory();
    const categoriesCollection = collection(db, "categories");
    const categoriesSnapshot = await getDocs(
      query(categoriesCollection, orderBy("order", "asc"))
    );
    return categoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];
  } catch (error) {
    console.error("Error getting categories:", error);
    throw error;
  }
};

export const getCategory = async (id: string): Promise<Category | null> => {
  try {
    const categoryDoc = doc(db, "categories", id);
    const categorySnapshot = await getDoc(categoryDoc);

    if (categorySnapshot.exists()) {
      return {
        id: categorySnapshot.id,
        ...categorySnapshot.data(),
      } as Category;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting category:", error);
    throw error;
  }
};

export const saveCategory = async (category: Category): Promise<string> => {
  try {
    if (category.id) {
      // Check if document exists before updating
      const categoryDoc = doc(db, "categories", category.id);
      const categorySnapshot = await getDoc(categoryDoc);
      
      if (categorySnapshot.exists()) {
        // Update existing category
        const { id, ...categoryData } = category;
        await updateDoc(categoryDoc, categoryData);
        return category.id;
      } else {
        // Document doesn't exist, create new one with the specified ID
        const categoriesCollection = collection(db, "categories");
        const { id, ...categoryData } = category;
        const docRef = await addDoc(categoriesCollection, categoryData);
        return docRef.id;
      }
    } else {
      // Create new category
      const categoriesCollection = collection(db, "categories");
      const docRef = await addDoc(categoriesCollection, category);
      return docRef.id;
    }
  } catch (error) {
    console.error("Error saving category:", error);
    throw error;
  }
};

export const updateCategory = async (category: Category): Promise<string> => {
  try {
    if (!category.id) {
      throw new Error("Category ID is required for updates");
    }
    
    // Check if document exists
    const categoryDoc = doc(db, "categories", category.id);
    const categorySnapshot = await getDoc(categoryDoc);
    
    if (categorySnapshot.exists()) {
      // Update existing category - preserve all existing data, just update what's provided
      const { id, ...categoryData } = category;
      await updateDoc(categoryDoc, categoryData);
      return category.id;
    } else {
      throw new Error(`Category with ID ${category.id} not found`);
    }
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const categoryDocRef = doc(db, "categories", id);
    await deleteDoc(categoryDocRef);
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

/**
 * Fixes category ordering by ensuring each category has a unique sequential order value
 * @returns Object containing success status, message, and number of categories updated
 */
export const fixCategoryOrders = async (): Promise<{ 
  success: boolean; 
  message: string; 
  updatedCount: number 
}> => {
  try {
    // Get all categories
    const categoryCollection = collection(db, "categories");
    const categorySnapshot = await getDocs(query(categoryCollection));
    const categories = categorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by current order (with fallback to 0 for undefined order)
    const sortedCategories = [...categories].sort((a: any, b: any) => {
      const orderA = a.order !== undefined ? a.order : 0;
      const orderB = b.order !== undefined ? b.order : 0;
      return orderA - orderB;
    });
    
    // Assign new sequential order values
    const updates = sortedCategories.map(async (category: any, index: number) => {
      if (category.order === index) return null; // Skip if already correct
      
      const categoryRef = doc(db, "categories", category.id);
      return updateDoc(categoryRef, { order: index });
    });
    
    // Execute all updates
    const completedUpdates = await Promise.all(updates.filter(Boolean));
    
    return { 
      success: true, 
      message: 'Category orders updated successfully',
      updatedCount: completedUpdates.length
    };
  } catch (error) {
    console.error('Error fixing category orders:', error);
    throw new Error('Failed to update category orders');
  }
};

// Get the highest order value among categories
export const getHighestCategoryOrder = async (): Promise<number> => {
  try {
    const categories = await getAllCategories();
    if (categories.length === 0) return -1;
    
    const highestOrder = Math.max(...categories.map(cat => 
      typeof cat.order === 'number' ? cat.order : -1
    ));
    
    return highestOrder;
  } catch (error) {
    console.error("Error getting highest category order:", error);
    throw error;
  }
};

export const seedCategories = async (categories: Category[]): Promise<void> => {
  try {
    for (const category of categories) {
      await saveCategory(category);
    }
  } catch (error) {
    console.error("Error seeding categories:", error);
    throw error;
  }
};
