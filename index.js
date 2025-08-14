const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token, clientId, guildId } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Ruta del archivo donde se guardan los embeds
const embedsPath = path.join(__dirname, 'embeds.json');
let embedsGuardados = {};
if (fs.existsSync(embedsPath)) {
    embedsGuardados = JSON.parse(fs.readFileSync(embedsPath, 'utf8'));
}

// Helper para guardar embeds en el JSON
function guardarEmbeds() {
    fs.writeFileSync(embedsPath, JSON.stringify(embedsGuardados, null, 2));
}

// Registro de comandos
const commands = [
    new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea un embed avanzado y lo guarda automáticamente')
        .addStringOption(option => option.setName('titulo').setDescription('Título del embed').setRequired(true))
        .addStringOption(option => option.setName('descripcion').setDescription('Descripción, usa | para saltos de línea').setRequired(true))
        .addStringOption(option => option.setName('color').setDescription('Color HEX o nombre').setRequired(false))
        .addStringOption(option => option.setName('thumbnail').setDescription('URL de thumbnail').setRequired(false))
        .addStringOption(option => option.setName('imagen').setDescription('URL de imagen').setRequired(false))
        .addStringOption(option => option.setName('campo1').setDescription('Campo extra 1').setRequired(false))
        .addStringOption(option => option.setName('campo2').setDescription('Campo extra 2').setRequired(false))
        .addStringOption(option => option.setName('campo3').setDescription('Campo extra 3').setRequired(false))
        .addStringOption(option => option.setName('campo4').setDescription('Campo extra 4').setRequired(false)),

    new SlashCommandBuilder()
        .setName('listembeds')
        .setDescription('Lista todos los embeds guardados'),

    new SlashCommandBuilder()
        .setName('sendembed')
        .setDescription('Envía un embed guardado a un canal')
        .addStringOption(option => option.setName('nombre').setDescription('Nombre del embed').setRequired(true))
        .addChannelOption(option => option.setName('canal').setDescription('Canal donde enviarlo').setRequired(true)),

    new SlashCommandBuilder()
        .setName('deleteembed')
        .setDescription('Elimina un embed guardado')
        .addStringOption(option => option.setName('nombre').setDescription('Nombre del embed').setRequired(true)),

    new SlashCommandBuilder()
        .setName('editembed')
        .setDescription('Edita un embed guardado')
        .addStringOption(option => option.setName('nombre').setDescription('Nombre del embed a editar').setRequired(true))
        .addStringOption(option => option.setName('titulo').setDescription('Nuevo título').setRequired(false))
        .addStringOption(option => option.setName('descripcion').setDescription('Nueva descripción, usa | para saltos').setRequired(false))
        .addStringOption(option => option.setName('color').setDescription('Nuevo color HEX o nombre').setRequired(false))
        .addStringOption(option => option.setName('thumbnail').setDescription('Nuevo thumbnail').setRequired(false))
        .addStringOption(option => option.setName('imagen').setDescription('Nueva imagen').setRequired(false))
        .addStringOption(option => option.setName('campo1').setDescription('Campo extra 1').setRequired(false))
        .addStringOption(option => option.setName('campo2').setDescription('Campo extra 2').setRequired(false))
        .addStringOption(option => option.setName('campo3').setDescription('Campo extra 3').setRequired(false))
        .addStringOption(option => option.setName('campo4').setDescription('Campo extra 4').setRequired(false))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        console.log('🔄 Registrando comandos...');
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
        console.log('✅ Comandos registrados!');
    } catch (error) {
        console.error(error);
    }
})();

// Evento ready
client.once('ready', () => {
    console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// Manejo de comandos
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const nombreAuto = () => `embed_${Date.now()}`; // Nombre único automático

    if (interaction.commandName === 'embed') {
        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion').replace(/\|/g, '\n');
        const color = interaction.options.getString('color') || '#0099ff';
        const thumbnail = interaction.options.getString('thumbnail');
        const imagen = interaction.options.getString('imagen');
        const campos = [
            interaction.options.getString('campo1'),
            interaction.options.getString('campo2'),
            interaction.options.getString('campo3'),
            interaction.options.getString('campo4')
        ].filter(c => c);

        const embed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descripcion)
            .setColor(color)
            .setFooter({ text: `Creado por ${interaction.user.username}` })
            .setTimestamp();

        if (thumbnail) embed.setThumbnail(thumbnail);
        if (imagen) embed.setImage(imagen);
        campos.forEach((c, i) => embed.addFields({ name: `Campo ${i+1}`, value: c, inline: false }));

        const nombre = nombreAuto();
        embedsGuardados[nombre] = embed.toJSON();
        guardarEmbeds();

        await interaction.reply({ content: `✅ Embed creado y guardado como **${nombre}**`, ephemeral: true });
    }

    else if (interaction.commandName === 'listembeds') {
        const lista = Object.keys(embedsGuardados);
        if (!lista.length) return interaction.reply({ content: '❌ No hay embeds guardados', ephemeral: true });
        await interaction.reply({ content: `📋 Embeds guardados:\n${lista.join('\n')}`, ephemeral: true });
    }

    else if (interaction.commandName === 'sendembed') {
        const nombre = interaction.options.getString('nombre');
        const canal = interaction.options.getChannel('canal');
        const embedData = embedsGuardados[nombre];
        if (!embedData) return interaction.reply({ content: '❌ No existe ese embed', ephemeral: true });
        const embed = EmbedBuilder.from(embedData);
        await canal.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ Embed enviado a ${canal}`, ephemeral: true });
    }

    else if (interaction.commandName === 'deleteembed') {
        const nombre = interaction.options.getString('nombre');
        if (!embedsGuardados[nombre]) return interaction.reply({ content: '❌ No existe ese embed', ephemeral: true });
        delete embedsGuardados[nombre];
        guardarEmbeds();
        await interaction.reply({ content: `✅ Embed **${nombre}** eliminado`, ephemeral: true });
    }

    else if (interaction.commandName === 'editembed') {
        const nombre = interaction.options.getString('nombre');
        const embedData = embedsGuardados[nombre];
        if (!embedData) return interaction.reply({ content: '❌ No existe ese embed', ephemeral: true });
        const embed = EmbedBuilder.from(embedData);

        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion')?.replace(/\|/g, '\n');
        const color = interaction.options.getString('color');
        const thumbnail = interaction.options.getString('thumbnail');
        const imagen = interaction.options.getString('imagen');
        const campos = [
            interaction.options.getString('campo1'),
            interaction.options.getString('campo2'),
            interaction.options.getString('campo3'),
            interaction.options.getString('campo4')
        ].filter(c => c);

        if (titulo) embed.setTitle(titulo);
        if (descripcion) embed.setDescription(descripcion);
        if (color) embed.setColor(color);
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (imagen) embed.setImage(imagen);

        embed.data.fields = []; // Limpiar campos antes de agregar
        campos.forEach((c, i) => embed.addFields({ name: `Campo ${i+1}`, value: c, inline: false }));

        embedsGuardados[nombre] = embed.toJSON();
        guardarEmbeds();

        await interaction.reply({ content: `✅ Embed **${nombre}** actualizado`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
