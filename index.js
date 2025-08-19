// index.js
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, REST, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// Leer datos desde variables de entorno (para Railway)
const config = {
    clientId: process.env.CLIENTID,
    guildId: process.env.GUILDID,
    modRoleId: process.env.MODROLEID,
    token: process.env.TOKEN
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Archivo donde guardaremos los embeds
const embedsFile = './embeds.json';
let savedEmbeds = {};
if (fs.existsSync(embedsFile)) {
    savedEmbeds = JSON.parse(fs.readFileSync(embedsFile));
}

// ---------------- REGISTRO DE COMANDOS ----------------
const commands = [
    // Crear Embed
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea y guarda un embed avanzado')
        .addStringOption(opt => opt.setName('nombre').setDescription('Nombre único para el embed').setRequired(false))
        .addStringOption(opt => opt.setName('titulo').setDescription('Título del embed').setRequired(false))
        .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción del embed').setRequired(false))
        .addStringOption(opt => opt.setName('color').setDescription('Color en HEX (#ff0000)').setRequired(false))
        .addStringOption(opt => opt.setName('imagen').setDescription('URL de imagen').setRequired(false))
        .addStringOption(opt => opt.setName('thumbnail').setDescription('URL de thumbnail').setRequired(false))
        .addStringOption(opt => opt.setName('footer').setDescription('Texto del footer').setRequired(false)),

    // Editar Embed
    new SlashCommandBuilder()
        .setName('editembed')
        .setDescription('Edita un embed guardado')
        .addStringOption(opt => opt.setName('nombre').setDescription('Nombre del embed a editar').setRequired(true))
        .addStringOption(opt => opt.setName('titulo').setDescription('Nuevo título').setRequired(false))
        .addStringOption(opt => opt.setName('descripcion').setDescription('Nueva descripción').setRequired(false))
        .addStringOption(opt => opt.setName('color').setDescription('Nuevo color en HEX').setRequired(false))
        .addStringOption(opt => opt.setName('imagen').setDescription('Nueva imagen').setRequired(false))
        .addStringOption(opt => opt.setName('thumbnail').setDescription('Nuevo thumbnail').setRequired(false))
        .addStringOption(opt => opt.setName('footer').setDescription('Nuevo footer').setRequired(false)),

    // Eliminar Embed
    new SlashCommandBuilder()
        .setName('deleteembed')
        .setDescription('Elimina un embed guardado')
        .addStringOption(opt => opt.setName('nombre').setDescription('Nombre del embed a eliminar').setRequired(true)),

    // Listar Embeds
    new SlashCommandBuilder()
        .setName('listembeds')
        .setDescription('Muestra todos los embeds guardados'),

    // Enviar Embed
    new SlashCommandBuilder()
        .setName('sendembed')
        .setDescription('Envía un embed guardado a un canal')
        .addStringOption(opt => opt.setName('nombre').setDescription('Nombre del embed guardado').setRequired(true))
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal donde enviarlo').setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log("🔄 Registrando comandos...");
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
        console.log("✅ Comandos registrados");
    } catch (error) {
        console.error("❌ Error al registrar comandos:", error);
    }
})();

// ---------------- FUNCIONES DE EMBEDS ----------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'embed') {
        const nombre = interaction.options.getString('nombre') || `embed_${Date.now()}`;
        const embed = new EmbedBuilder();

        if (interaction.options.getString('titulo')) embed.setTitle(interaction.options.getString('titulo'));
        if (interaction.options.getString('descripcion')) embed.setDescription(interaction.options.getString('descripcion').replace(/\\n/g, '\n'));
        if (interaction.options.getString('color')) embed.setColor(interaction.options.getString('color'));
        if (interaction.options.getString('imagen')) embed.setImage(interaction.options.getString('imagen'));
        if (interaction.options.getString('thumbnail')) embed.setThumbnail(interaction.options.getString('thumbnail'));
        if (interaction.options.getString('footer')) embed.setFooter({ text: interaction.options.getString('footer') });

        savedEmbeds[nombre] = embed.toJSON();
        fs.writeFileSync(embedsFile, JSON.stringify(savedEmbeds, null, 2));

        await interaction.reply({ content: `✅ Embed **${nombre}** creado y guardado.`, embeds: [embed] });

    } else if (commandName === 'editembed') {
        const nombre = interaction.options.getString('nombre');
        if (!savedEmbeds[nombre]) return interaction.reply({ content: `❌ No existe un embed con el nombre **${nombre}**.`, ephemeral: true });

        const embedData = savedEmbeds[nombre];
        const embed = EmbedBuilder.from(embedData);

        if (interaction.options.getString('titulo')) embed.setTitle(interaction.options.getString('titulo'));
        if (interaction.options.getString('descripcion')) embed.setDescription(interaction.options.getString('descripcion').replace(/\\n/g, '\n'));
        if (interaction.options.getString('color')) embed.setColor(interaction.options.getString('color'));
        if (interaction.options.getString('imagen')) embed.setImage(interaction.options.getString('imagen'));
        if (interaction.options.getString('thumbnail')) embed.setThumbnail(interaction.options.getString('thumbnail'));
        if (interaction.options.getString('footer')) embed.setFooter({ text: interaction.options.getString('footer') });

        savedEmbeds[nombre] = embed.toJSON();
        fs.writeFileSync(embedsFile, JSON.stringify(savedEmbeds, null, 2));

        await interaction.reply({ content: `✏️ Embed **${nombre}** actualizado.`, embeds: [embed] });

    } else if (commandName === 'deleteembed') {
        const nombre = interaction.options.getString('nombre');
        if (!savedEmbeds[nombre]) return interaction.reply({ content: `❌ No existe un embed con el nombre **${nombre}**.`, ephemeral: true });

        delete savedEmbeds[nombre];
        fs.writeFileSync(embedsFile, JSON.stringify(savedEmbeds, null, 2));

        await interaction.reply({ content: `🗑️ Embed **${nombre}** eliminado.` });

    } else if (commandName === 'listembeds') {
        const nombres = Object.keys(savedEmbeds);
        if (nombres.length === 0) return interaction.reply({ content: "📭 No hay embeds guardados.", ephemeral: true });

        await interaction.reply({ content: `📋 Embeds guardados:\n- ${nombres.join("\n- ")}` });

    } else if (commandName === 'sendembed') {
        const nombre = interaction.options.getString('nombre');
        const canal = interaction.options.getChannel('canal');
        if (!savedEmbeds[nombre]) return interaction.reply({ content: `❌ No existe un embed con el nombre **${nombre}**.`, ephemeral: true });

        const embed = EmbedBuilder.from(savedEmbeds[nombre]);
        canal.send({ embeds: [embed] });

        await interaction.reply({ content: `📨 Embed **${nombre}** enviado a ${canal}.`, ephemeral: true });
    }
});

client.once('ready', () => {
    console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

client.login(config.token);
