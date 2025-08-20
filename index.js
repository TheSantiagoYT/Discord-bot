const { Client, GatewayIntentBits, Partials, Collection, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

// ===================== ARCHIVO DE EMBEDS =====================
const embedsFile = "./embeds.json";
if (!fs.existsSync(embedsFile)) fs.writeFileSync(embedsFile, "{}");
let embedsData = JSON.parse(fs.readFileSync(embedsFile, "utf8"));

function saveEmbeds() {
  fs.writeFileSync(embedsFile, JSON.stringify(embedsData, null, 2));
}

// ===================== REGISTRO DE EMBED SELECCIONADO =====================
if (!client.selectedEmbeds) client.selectedEmbeds = {};

// ===================== FUNCIONES =====================
function createEmbed(user, title, description, color = "Blue") {
  const embed = new EmbedBuilder().setColor(color);

  if (title && title.trim().length > 0) embed.setTitle(title.trim());
  embed.setDescription(description && description.trim().length > 0 ? description.trim() : "\u200b");

  embed.setFooter({ text: `Creado por ${user.tag} • ${new Date().toLocaleString()}` });

  return embed;
}

function getEmbedButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("edit_title").setLabel("Título").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("edit_description").setLabel("Descripción").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("edit_color").setLabel("Color").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("edit_thumbnail").setLabel("Miniatura").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("edit_image").setLabel("Imagen").setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("edit_footer").setLabel("Footer").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("save_embed").setLabel("Guardar").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("cancel_embed").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

// ===================== COMANDOS =====================
client.commands = new Collection();
const commands = [
  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Crea un nuevo embed")
    .addStringOption(opt => opt.setName("nombre").setDescription("Nombre para guardar este embed").setRequired(true)),

  new SlashCommandBuilder()
    .setName("editembed")
    .setDescription("Edita un embed guardado"),

  new SlashCommandBuilder()
    .setName("listembed")
    .setDescription("Lista tus embeds guardados"),

  new SlashCommandBuilder()
    .setName("embed-send")
    .setDescription("Envía un embed guardado a un canal")
    .addStringOption(opt => 
        opt.setName("nombre")
           .setDescription("Nombre del embed que quieres enviar")
           .setRequired(true))
    .addStringOption(opt => 
        opt.setName("canal")
           .setDescription("ID del canal donde enviar el embed")
           .setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("✅ Comandos registrados");
  } catch (err) {
    console.error(err);
  }
})();

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// ===================== INTERACCIONES =====================
client.on("interactionCreate", async (interaction) => {
  const userId = interaction.user.id;

  // ===================== SLASH COMMANDS =====================
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "embed") {
      const name = interaction.options.getString("nombre");
      if (!embedsData[userId]) embedsData[userId] = {};

      const embed = createEmbed(interaction.user);
      embedsData[userId][name] = embed.data;
      saveEmbeds();

      client.selectedEmbeds[userId] = name;

      return interaction.reply({
        content: `✅ Embed **${name}** creado exitosamente.`,
        embeds: [embed],
        components: getEmbedButtons(),
        ephemeral: false
      });
    }

    if (interaction.commandName === "editembed") {
      const userEmbeds = embedsData[userId] || {};
      const options = Object.keys(userEmbeds).map(key => ({ label: key, value: key }));
      if (options.length === 0) return interaction.reply({ content: "⚠️ No tienes embeds guardados.", ephemeral: false });

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_embed")
          .setPlaceholder("Selecciona un embed para editar")
          .addOptions(options)
      );

      return interaction.reply({ content: "✏️ Selecciona el embed que quieres editar:", components: [menu], ephemeral: false });
    }

    if (interaction.commandName === "listembed") {
      const userEmbeds = embedsData[userId] || {};
      if (Object.keys(userEmbeds).length === 0) return interaction.reply({ content: "⚠️ No tienes embeds guardados.", ephemeral: false });

      const list = Object.keys(userEmbeds).map(n => `• **${n}**`).join("\n");
      return interaction.reply({ content: `📂 Tus embeds guardados:\n${list}`, ephemeral: false });
    }

    if (interaction.commandName === "embed-send") {
      const nombre = interaction.options.getString("nombre");
      const canalId = interaction.options.getString("canal");

      const embedData = embedsData[userId]?.[nombre];
      if (!embedData) return interaction.reply({ content: "⚠️ No existe ese embed.", ephemeral: true });

      const channel = client.channels.cache.get(canalId);
      if (!channel) return interaction.reply({ content: "⚠️ ID de canal inválido.", ephemeral: true });

      await channel.send({ embeds: [EmbedBuilder.from(embedData)] });
      return interaction.reply({ content: `✅ Embed **${nombre}** enviado a <#${canalId}>.`, ephemeral: true });
    }
  }

  // ===================== SELECT MENU =====================
  if (interaction.isStringSelectMenu() && interaction.customId === "select_embed") {
    const chosen = interaction.values[0];
    const embedData = embedsData[userId][chosen];
    const embed = EmbedBuilder.from(embedData);

    client.selectedEmbeds[userId] = chosen;

    return interaction.update({ content: `✏️ Editando embed **${chosen}**`, embeds: [embed], components: getEmbedButtons() });
  }

  // ===================== BOTONES =====================
  if (interaction.isButton()) {
    const selected = client.selectedEmbeds[userId];
    if (!selected) return interaction.reply({ content: "⚠️ No hay embed seleccionado.", ephemeral: true });

    const embedData = embedsData[userId][selected];
    let embed = EmbedBuilder.from(embedData);

    if (interaction.customId === "save_embed") {
      embed.setFooter({ text: `Creado por ${interaction.user.tag} • ${new Date().toLocaleString()}` });
      embedsData[userId][selected] = embed.data;
      saveEmbeds();
      return interaction.reply({ content: "💾 Embed guardado correctamente.", ephemeral: true });
    }

    if (interaction.customId === "cancel_embed") {
      delete embedsData[userId][selected];
      delete client.selectedEmbeds[userId];
      saveEmbeds();
      return interaction.reply({ content: "❌ Embed cancelado y eliminado.", ephemeral: true });
    }

    // Abrir modales
    let modal;
    switch (interaction.customId) {
      case "edit_title":
        modal = new ModalBuilder().setCustomId("modal_title").setTitle("Editar Título").addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("title_input").setLabel("Nuevo título").setStyle(TextInputStyle.Short).setValue(embed.data.title || "").setRequired(false)
          )
        );
        break;
      case "edit_description":
        modal = new ModalBuilder().setCustomId("modal_description").setTitle("Editar Descripción").addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("description_input").setLabel("Nueva descripción").setStyle(TextInputStyle.Paragraph).setValue(embed.data.description || "").setRequired(false)
          )
        );
        break;
      case "edit_color":
        modal = new ModalBuilder().setCustomId("modal_color").setTitle("Editar Color").addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("color_input").setLabel("Color HEX").setStyle(TextInputStyle.Short).setValue(embed.data.color?.toString(16) || "").setRequired(false)
          )
        );
        break;
      case "edit_thumbnail":
        modal = new ModalBuilder().setCustomId("modal_thumbnail").setTitle("Editar Miniatura").addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("thumbnail_input").setLabel("URL de la miniatura").setStyle(TextInputStyle.Short).setValue(embed.data.thumbnail?.url || "").setRequired(false)
          )
        );
        break;
      case "edit_image":
        modal = new ModalBuilder().setCustomId("modal_image").setTitle("Editar Imagen").addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("image_input").setLabel("URL de la imagen").setStyle(TextInputStyle.Short).setValue(embed.data.image?.url || "").setRequired(false)
          )
        );
        break;
      case "edit_footer":
        modal = new ModalBuilder().setCustomId("modal_footer").setTitle("Editar Footer").addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("footer_input").setLabel("Texto del footer").setStyle(TextInputStyle.Short).setValue(embed.data.footer?.text || "").setRequired(false)
          )
        );
        break;
    }

    if (modal) return interaction.showModal(modal);
  }

  // ===================== MODALES =====================
  if (interaction.isModalSubmit()) {
    const selected = client.selectedEmbeds[userId];
    if (!selected) return interaction.reply({ content: "⚠️ No hay embed seleccionado.", ephemeral: true });

    let embed = EmbedBuilder.from(embedsData[userId][selected]);

    switch (interaction.customId) {
      case "modal_title":
        const t = interaction.fields.getTextInputValue("title_input").trim();
        if (t.length > 0) embed.setTitle(t);
        break;
      case "modal_description":
        const d = interaction.fields.getTextInputValue("description_input").trim();
        embed.setDescription(d.length > 0 ? d : "\u200b");
        break;
      case "modal_color":
        const c = interaction.fields.getTextInputValue("color_input").trim();
        if (c.length > 0) embed.setColor(c);
        break;
      case "modal_thumbnail":
        const thumb = interaction.fields.getTextInputValue("thumbnail_input").trim();
        if (thumb.length > 0) embed.setThumbnail(thumb);
        else embed.data.thumbnail = undefined;
        break;
      case "modal_image":
        const img = interaction.fields.getTextInputValue("image_input").trim();
        if (img.length > 0) embed.setImage(img);
        else embed.data.image = undefined;
        break;
      case "modal_footer":
        const f = interaction.fields.getTextInputValue("footer_input").trim();
        embed.setFooter({ text: f.length > 0 ? f : `Creado por ${interaction.user.tag} • ${new Date().toLocaleString()}` });
        break;
    }

    if (!interaction.customId.includes("footer"))
      embed.setFooter({ text: `Creado por ${interaction.user.tag} • ${new Date().toLocaleString()}` });

    embedsData[userId][selected] = embed.data;
    saveEmbeds();

    return interaction.update({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
