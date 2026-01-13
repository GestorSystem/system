'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar se as funções já existem
    const existingFunctions = await queryInterface.sequelize.query(
      "SELECT id, name FROM sys_functions WHERE id IN (45, 46, 47) OR name IN ('adm.manter_modules', 'adm.visualizar_modules', 'adm.criar_modules')",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const existingIds = new Set(existingFunctions.map(f => f.id));
    const existingNames = new Set(existingFunctions.map(f => f.name));
    
    const functionsToInsert = [
      { id: 45, name: 'adm.manter_modules', title: 'Manter Módulos', createdAt: new Date(), updatedAt: new Date() },
      { id: 46, name: 'adm.visualizar_modules', title: 'Visualizar Módulos', createdAt: new Date(), updatedAt: new Date() },
      { id: 47, name: 'adm.criar_modules', title: 'Criar Módulos', createdAt: new Date(), updatedAt: new Date() }
    ].filter(f => !existingIds.has(f.id) && !existingNames.has(f.name));
    
    if (functionsToInsert.length > 0) {
      await queryInterface.bulkInsert('sys_functions', functionsToInsert, {});
      console.log(`✅ ${functionsToInsert.length} função(ões) de módulos inserida(s)`);
    } else {
      console.log('⏭️  Todas as funções de módulos já existem. Pulando inserção.');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_functions', { id: [45, 46, 47] }, {});
  }
};

