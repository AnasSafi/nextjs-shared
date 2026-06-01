import React, {forwardRef, useEffect} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {ModalTemplateCore} from "../src/components/Modal/ModalTemplateCore";
import {useReusableModal} from "../src/hooks/modalHooks/useReusableModal";
import {useModalStore} from "../src/store/modalStore";
import type {FormPropsModel, FormRefModel} from "../src/models/core/formModels";

const t = (key: string): string => key;

function resetModalStore(): void {
    useModalStore.setState({
        modals: {},
        modalStack: [],
    });
}

function openModalIds(): string[] {
    const {modals} = useModalStore.getState();
    return Object.keys(modals).filter((id) => modals[id]?.isOpen);
}

function ModalHost(): React.ReactElement {
    const modals = useModalStore((state) => state.modals);
    const modalStack = useModalStore((state) => state.modalStack ?? Object.keys(state.modals));

    return (
        <>
            {modalStack.map((id) => {
                const modal = modals[id];
                if (!modal?.isOpen) return null;

                return (
                    <ModalTemplateCore key={id} id={id} t={t}>
                        {modal.content}
                    </ModalTemplateCore>
                );
            })}
        </>
    );
}

const ParentForm = forwardRef<FormRefModel, FormPropsModel<undefined, string>>(
    (_props, _ref) => <div>parent form</div>,
);
ParentForm.displayName = "ParentForm";

const ChildForm = forwardRef<FormRefModel, FormPropsModel<undefined, string>>(
    (props, _ref) => (
        <button type="button" onClick={() => props.closeModalWithData("child-result")}>
            save child
        </button>
    ),
);
ChildForm.displayName = "ChildForm";

function ReusableModalHarness(
    {onChildResult}: {onChildResult: (value: string | null) => void},
): React.ReactElement {
    const {openModal: openParentModal} = useReusableModal<undefined, string>({
        t,
        allowed: "All",
        modalId: "parent",
        dialogTitleKey: "parent",
        FormComponent: ParentForm,
    });
    const {openModal: openChildModal} = useReusableModal<undefined, string>({
        t,
        allowed: "All",
        modalId: "child",
        dialogTitleKey: "child",
        FormComponent: ChildForm,
    });

    useEffect(() => {
        void openParentModal();
        void openChildModal().then(onChildResult);
    }, []);

    return <ModalHost />;
}

describe("rendered modal stack close behavior", () => {
    beforeEach(() => {
        resetModalStore();
        window.history.replaceState({}, "", "/");
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        resetModalStore();
    });

    it("closes a child modal without closing the parent through direct store close", () => {
        const {openModal, closeModal} = useModalStore.getState();

        act(() => {
            openModal("parent", <div>parent</div>);
            openModal("child", <div>child</div>);
            closeModal("child");
        });

        const {modals} = useModalStore.getState();
        expect(modals.parent?.isOpen).toBe(true);
        expect(modals.child?.isOpen).toBe(false);
        expect(openModalIds()).toEqual(["parent"]);
    });

    it("closes only the child through the rendered X button", async () => {
        const {openModal} = useModalStore.getState();

        render(<ModalHost />);

        act(() => {
            openModal("parent", <div>parent</div>);
            openModal("child", <div>child</div>);
        });

        const closeButtons = await screen.findAllByLabelText("Close");
        fireEvent.click(closeButtons[closeButtons.length - 1]);

        await waitFor(() => expect(useModalStore.getState().modals.child?.isOpen).toBe(false));
        expect(useModalStore.getState().modals.parent?.isOpen).toBe(true);
    });

    it("closes only the topmost modal on Escape", () => {
        const {openModal} = useModalStore.getState();

        render(<ModalHost />);

        act(() => {
            openModal("parent", <div>parent</div>);
            openModal("child", <div>child</div>);
        });

        fireEvent.keyDown(document, {key: "Escape"});

        const {modals} = useModalStore.getState();
        expect(modals.parent?.isOpen).toBe(true);
        expect(modals.child?.isOpen).toBe(false);
    });

    it("closes only the target child modal through its backdrop", async () => {
        const {openModal} = useModalStore.getState();
        const {container} = render(<ModalHost />);

        act(() => {
            openModal("parent", <div>parent</div>, {preventCloseOutside: false});
            openModal("child", <div>child</div>, {preventCloseOutside: false});
        });

        await screen.findByText("child");
        const backdrops = container.querySelectorAll(".bg-black\\/75");
        fireEvent.click(backdrops[backdrops.length - 1]);

        await waitFor(() => expect(useModalStore.getState().modals.child?.isOpen).toBe(false));
        expect(useModalStore.getState().modals.parent?.isOpen).toBe(true);
    });

    it("closes only the child modal when closeModalWithData is called", async () => {
        const onChildResult = vi.fn();

        render(<ReusableModalHarness onChildResult={onChildResult} />);

        fireEvent.click(await screen.findByRole("button", {name: "save child"}));

        await waitFor(() => expect(onChildResult).toHaveBeenCalledWith("child-result"));
        expect(useModalStore.getState().modals.parent?.isOpen).toBe(true);
        expect(useModalStore.getState().modals.child?.isOpen).toBe(false);
    });

    it("does not call history.back when a rendered child modal is closed programmatically", async () => {
        const historyBackSpy = vi.spyOn(window.history, "back");
        const {openModal} = useModalStore.getState();

        render(<ModalHost />);

        act(() => {
            openModal("parent", <div>parent</div>);
            openModal("child", <div>child</div>);
        });

        const closeButtons = await screen.findAllByLabelText("Close");
        fireEvent.click(closeButtons[closeButtons.length - 1]);

        await waitFor(() => expect(useModalStore.getState().modals.child?.isOpen).toBe(false));
        await new Promise((resolve) => window.setTimeout(resolve, 0));

        expect(useModalStore.getState().modals.parent?.isOpen).toBe(true);
        expect(historyBackSpy).not.toHaveBeenCalled();
    });

    it("closes only the topmost child modal on popstate", async () => {
        const {openModal} = useModalStore.getState();

        render(<ModalHost />);

        act(() => {
            openModal("parent", <div>parent</div>);
            openModal("child", <div>child</div>);
        });

        window.dispatchEvent(new PopStateEvent("popstate", {state: {}}));

        await waitFor(() => expect(useModalStore.getState().modals.child?.isOpen).toBe(false));
        expect(useModalStore.getState().modals.parent?.isOpen).toBe(true);
    });
});
