'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar quais relações já existem
    const existingRelations = await queryInterface.sequelize.query(
      "SELECT id_role, id_function FROM sys_roles_functions WHERE (id_role IN (1, 2) AND id_function IN (45, 46, 47))",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const existingKeys = new Set(
      existingRelations.map(r => `${r.id_role}-${r.id_function}`)
    );
    
    const rolesFunctions = [];

    // Role 1 (ADMIN) - Todas as funções de módulos (45, 46, 47)
    [45, 46, 47].forEach(id_function => {
      const key = `1-${id_function}`;
      if (!existingKeys.has(key)) {
        rolesFunctions.push({
          id_role: 1, // ADMIN
          id_function: id_function,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });

    // Role 2 (MANAGER) - Apenas visualizar módulos (46)
    [46].forEach(id_function => {
      const key = `2-${id_function}`;
      if (!existingKeys.has(key)) {
        rolesFunctions.push({
          id_role: 2, // MANAGER
          id_function: id_function,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });

    if (rolesFunctions.length > 0) {
      await queryInterface.bulkInsert('sys_roles_functions', rolesFunctions, {});
      console.log(`✅ ${rolesFunctions.length} relação(ões) role-function de módulos inserida(s)`);
    } else {
      console.log('⏭️  Todas as relações role-function de módulos já existem. Pulando inserção.');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sys_roles_functions', { 
      id_role: [1, 2],
      id_function: [45, 46, 47]
    }, {});
  }
};

