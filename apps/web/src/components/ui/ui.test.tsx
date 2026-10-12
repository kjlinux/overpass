import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import fr from "./locales/fr.json";
import {
  Button,
  CodeBlock,
  ConfirmDialog,
  EmptyState,
  Field,
  Skeleton,
  StatusBadge,
  Table,
  Tabs,
  TextInput,
  cx,
} from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
});

describe("Button", () => {
  it("renders a 44 px primary button of type button", () => {
    const html = render(<Button variant="primary">Go</Button>);
    expect(html).toContain('type="button"');
    expect(html).toContain("min-h-tap");
    expect(html).toContain("bg-accent");
  });

  it("disables itself and announces loading", () => {
    const html = render(<Button loading>Go</Button>);
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(fr.loading);
  });
});

describe("Field", () => {
  it("links help and error text to the control", () => {
    const html = render(
      <Field id="f" label="Montant" help="Aide" error="Erreur">
        {(control) => <TextInput {...control} />}
      </Field>,
    );
    expect(html).toContain('for="f"');
    expect(html).toContain('aria-describedby="f-error f-help"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });
});

describe("StatusBadge", () => {
  it("carries the state in text", () => {
    expect(render(<StatusBadge status="clear" />)).toContain(fr.status.clear);
    expect(render(<StatusBadge status="broken" />)).toContain(fr.status.broken);
  });
});

describe("Table", () => {
  it("renders headers, a caption and right-aligned numbers", () => {
    const rows = [{ id: "a", n: 1 }];
    const html = render(
      <Table
        caption="Légende"
        rows={rows}
        rowKey={(row) => row.id}
        columns={[{ key: "n", header: "Nombre", numeric: true, render: (row) => row.n }]}
      />,
    );
    expect(html).toContain("<caption");
    expect(html).toContain('scope="col"');
    expect(html).toContain("text-right");
  });
});

describe("Tabs", () => {
  it("selects the first tab and hides the other panels", () => {
    const html = render(
      <Tabs
        id="t"
        label="Onglets"
        tabs={[
          { id: "a", label: "A", content: "Un" },
          { id: "b", label: "B", content: "Deux" },
        ]}
      />,
    );
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("hidden");
  });
});

describe("CodeBlock, dialog, skeleton, empty state", () => {
  it("offers a labelled copy button", () => {
    const html = render(<CodeBlock code="npm test" language="bash" />);
    expect(html).toContain(`aria-label="${fr.copy}"`);
    expect(html).toContain("npm test");
  });

  it("renders a native dialog with cancel and confirm actions", () => {
    const html = render(
      <ConfirmDialog
        open={false}
        title="Supprimer ?"
        description="Définitif."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(html).toContain("<dialog");
    expect(html).toContain(fr.cancel);
    expect(html).toContain("bg-danger");
  });

  it("marks the skeleton busy and the empty state with one action", () => {
    expect(render(<Skeleton />)).toContain('aria-busy="true"');
    const html = render(
      <EmptyState title="Rien" description="Vide" action={<Button>Créer</Button>} />,
    );
    expect(html).toContain("Rien");
    expect(html).toContain("Créer");
  });
});

describe("cx", () => {
  it("joins only real class names", () => {
    expect(cx("a", false, undefined, "", "b")).toBe("a b");
  });
});
