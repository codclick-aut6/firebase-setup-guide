
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { categories as localCategories, menuItems as localMenuItems } from "@/data/menuData";
import { Category, MenuItem, Variation, VariationGroup } from "@/types/menu";

// Dados iniciais para variações
const initialVariations: Variation[] = [
  {
    id: "var-tamanho-pequeno",
    name: "Pequeno",
    description: "Tamanho pequeno",
    additionalPrice: 0,
    available: true,
    categoryIds: ["entradas", "porções-", "principais"]
  },
  {
    id: "var-tamanho-medio",
    name: "Médio", 
    description: "Tamanho médio",
    additionalPrice: 5,
    available: true,
    categoryIds: ["entradas", "porções-", "principais"]
  },
  {
    id: "var-tamanho-grande",
    name: "Grande",
    description: "Tamanho grande", 
    additionalPrice: 10,
    available: true,
    categoryIds: ["entradas", "porções-", "principais"]
  },
  {
    id: "var-molho-ketchup",
    name: "Ketchup",
    description: "Molho ketchup",
    additionalPrice: 0,
    available: true,
    categoryIds: ["porções-", "hambúrgueres-"]
  },
  {
    id: "var-molho-mostarda",
    name: "Mostarda",
    description: "Molho mostarda",
    additionalPrice: 0,
    available: true,
    categoryIds: ["porções-", "hambúrgueres-"]
  },
  {
    id: "var-molho-maionese",
    name: "Maionese",
    description: "Molho maionese",
    additionalPrice: 0,
    available: true,
    categoryIds: ["porções-", "hambúrgueres-"]
  },
  {
    id: "var-queijo-cheddar",
    name: "Queijo Cheddar",
    description: "Queijo cheddar extra",
    additionalPrice: 3,
    available: true,
    categoryIds: ["hambúrgueres-", "principais"]
  },
  {
    id: "var-bacon",
    name: "Bacon",
    description: "Bacon crocante",
    additionalPrice: 5,
    available: true,
    categoryIds: ["hambúrgueres-", "principais"]
  }
];

// Dados iniciais para grupos de variações
const initialVariationGroups: VariationGroup[] = [
  {
    id: "group-tamanho",
    name: "Tamanho",
    minRequired: 1,
    maxAllowed: 1,
    variations: ["var-tamanho-pequeno", "var-tamanho-medio", "var-tamanho-grande"],
    customMessage: "Escolha o tamanho:"
  },
  {
    id: "group-molhos",
    name: "Molhos",
    minRequired: 0,
    maxAllowed: 3,
    variations: ["var-molho-ketchup", "var-molho-mostarda", "var-molho-maionese"],
    customMessage: "Escolha até 3 molhos (opcional):"
  },
  {
    id: "group-extras",
    name: "Extras",
    minRequired: 0,
    maxAllowed: 2,
    variations: ["var-queijo-cheddar", "var-bacon"],
    customMessage: "Adicione extras (opcional):"
  }
];

export const clearCollection = async (collectionName: string) => {
  console.log(`Limpando coleção: ${collectionName}`);
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  const deletePromises = snapshot.docs.map(document => deleteDoc(document.ref));
  await Promise.all(deletePromises);
  
  console.log(`Coleção ${collectionName} limpa com sucesso`);
};

export const seedCategories = async () => {
  console.log("Populando categorias...");
  const categoriesCollection = collection(db, "categories");
  
  for (const category of localCategories) {
    const categoryData = {
      ...category,
      order: localCategories.indexOf(category)
    };
    await addDoc(categoriesCollection, categoryData);
    console.log(`Categoria adicionada: ${category.name}`);
  }
  
  console.log("Categorias populadas com sucesso!");
};

export const seedMenuItems = async () => {
  console.log("Populando itens do menu...");
  const menuItemsCollection = collection(db, "menuItems");
  
  for (const item of localMenuItems) {
    const itemData = {
      ...item,
      image: item.image || "/placeholder.svg"
    };
    await addDoc(menuItemsCollection, itemData);
    console.log(`Item adicionado: ${item.name}`);
  }
  
  console.log("Itens do menu populados com sucesso!");
};

export const seedVariations = async () => {
  console.log("Populando variações...");
  const variationsCollection = collection(db, "variations");
  
  for (const variation of initialVariations) {
    await addDoc(variationsCollection, variation);
    console.log(`Variação adicionada: ${variation.name}`);
  }
  
  console.log("Variações populadas com sucesso!");
};

export const seedVariationGroups = async () => {
  console.log("Populando grupos de variações...");
  const variationGroupsCollection = collection(db, "variationGroups");
  
  for (const group of initialVariationGroups) {
    await addDoc(variationGroupsCollection, group);
    console.log(`Grupo de variação adicionado: ${group.name}`);
  }
  
  console.log("Grupos de variações populados com sucesso!");
};

export const seedAllData = async () => {
  try {
    console.log("=== INICIANDO POPULAÇÃO COMPLETA DO FIREBASE ===");
    
    // Limpar coleções existentes (opcional)
    await clearCollection("categories");
    await clearCollection("menuItems");
    await clearCollection("variations");
    await clearCollection("variationGroups");
    
    // Popular com dados iniciais
    await seedCategories();
    await seedMenuItems();
    await seedVariations();
    await seedVariationGroups();
    
    console.log("=== POPULAÇÃO COMPLETA FINALIZADA COM SUCESSO ===");
    return { success: true, message: "Todas as coleções foram populadas com sucesso!" };
  } catch (error) {
    console.error("Erro ao popular Firebase:", error);
    throw new Error(`Falha ao popular Firebase: ${error.message}`);
  }
};
